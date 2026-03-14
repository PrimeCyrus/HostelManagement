const db = require('../database/database');
const bcrypt = require('bcrypt');

// ---- STATS & OVERVIEW ----
exports.getStats = async (req, res) => {
    console.log('Fetching Admin Stats...');
    
    // Helper function for db.get with promises
    const getPromise = (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    };

    try {
        const stats = {};
        const [
            studentsRow,
            roomsRow,
            hostelsRow,
            complaintsRow,
            wardensRow,
            applicationsRow,
            bedStatsRow,
            feeStatsRow
        ] = await Promise.all([
            getPromise('SELECT COUNT(*) as count FROM Students'),
            getPromise('SELECT COUNT(*) as count FROM Rooms'),
            getPromise('SELECT COUNT(*) as count FROM Hostels'),
            getPromise('SELECT COUNT(*) as count FROM Complaints WHERE status = "pending"'),
            getPromise('SELECT COUNT(*) as count FROM Users WHERE role = "warden"'),
            getPromise('SELECT COUNT(*) as count FROM Students WHERE approval_status = "pending"'),
            getPromise('SELECT SUM(capacity) as total_capacity, SUM(available_beds) as available_beds FROM Rooms'),
            getPromise('SELECT SUM(CASE WHEN payment_status = "paid" THEN amount ELSE 0 END) as total_collected, SUM(CASE WHEN payment_status = "pending" THEN amount ELSE 0 END) as total_pending FROM Fees')
        ]);

        stats.students = studentsRow.count || 0;
        stats.rooms = roomsRow.count || 0;
        stats.hostels = hostelsRow.count || 0;
        stats.complaints = complaintsRow.count || 0;
        stats.wardens = wardensRow.count || 0;
        stats.pending_applications = applicationsRow.count || 0;
        stats.total_capacity = bedStatsRow.total_capacity || 0;
        stats.available_beds = bedStatsRow.available_beds || 0;
        stats.occupancy_rate = stats.total_capacity > 0 ? Math.round(((stats.total_capacity - stats.available_beds) / stats.total_capacity) * 100) : 0;
        stats.fees_collected = feeStatsRow.total_collected || 0;
        stats.fees_pending = feeStatsRow.total_pending || 0;

        console.log('Admin Stats fetched successfully:', stats);
        res.json(stats);
    } catch (err) {
        console.error('Error fetching admin stats:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ---- HOSTELS ----
exports.getHostels = (req, res) => {
    console.log('Fetching all hostels...');
    db.all('SELECT * FROM Hostels', [], (err, rows) => {
        if (err) {
            console.error('Error fetching hostels:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Fetched ${rows.length} hostels`);
        res.json(rows);
    });
};

exports.addHostel = (req, res) => {
    const { name, gender } = req.body;
    db.run('INSERT INTO Hostels (name, gender) VALUES (?, ?)', [name, gender || 'mixed'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, gender: gender || 'mixed' });
    });
};

exports.deleteHostel = (req, res) => {
    const { id } = req.params;
    db.serialize(() => {
        db.run('DELETE FROM Allocations WHERE room_id IN (SELECT id FROM Rooms WHERE hostel_id = ?)', [id]);
        db.run('DELETE FROM Rooms WHERE hostel_id = ?', [id]);
        db.run('DELETE FROM Hostels WHERE hostel_id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Hostel not found' });
            res.json({ message: 'Hostel deleted successfully' });
        });
    });
};

exports.editHostel = (req, res) => {
    const { id } = req.params;
    const { name, gender } = req.body;
    db.run('UPDATE Hostels SET name = ?, gender = ? WHERE hostel_id = ?', [name, gender || 'mixed', id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Hostel not found' });
        res.json({ message: 'Hostel updated successfully', id, name, gender });
    });
};

// ---- ROOMS ----
exports.getRooms = (req, res) => {
    console.log('Fetching all rooms...');
    db.all(`
        SELECT Rooms.*, Hostels.name as hostel_name 
        FROM Rooms 
        LEFT JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching rooms:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Fetched ${rows.length} rooms`);
        res.json(rows);
    });
};

exports.addRoom = (req, res) => {
    const { hostel_id, room_no, capacity } = req.body;
    db.run('INSERT INTO Rooms (hostel_id, room_no, capacity, available_beds) VALUES (?, ?, ?, ?)',
        [hostel_id, room_no, capacity, capacity], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, hostel_id, room_no, capacity, available_beds: capacity });
        });
};

exports.deleteRoom = (req, res) => {
    const { id } = req.params;
    db.serialize(() => {
        db.run('DELETE FROM Allocations WHERE room_id = ?', [id]);
        db.run('DELETE FROM Rooms WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Room not found' });
            res.json({ message: 'Room deleted successfully' });
        });
    });
};

exports.editRoom = (req, res) => {
    const { id } = req.params;
    const { room_no, capacity } = req.body;
    // Basic update: doesn't check available_beds constraints, assuming admin will handle manually if needed.
    db.run('UPDATE Rooms SET room_no = ?, capacity = ? WHERE id = ?', [room_no, capacity, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Room not found' });
        res.json({ message: 'Room updated successfully', id, room_no, capacity });
    });
};

// ---- STUDENTS ----
exports.getStudents = (req, res) => {
    console.log('Fetching all students...');
    db.all(`
        SELECT Students.*, Users.email 
        FROM Students 
        LEFT JOIN Users ON Students.user_id = Users.id
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching students:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Fetched ${rows.length} students`);
        res.json(rows);
    });
};

exports.addStudent = async (req, res) => {
    const { name, email, password, course, phone, guardian_name, guardian_contact, address, gender } = req.body;
    console.log(`Attempting to add student: ${email} by Admin`);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, 'student')`,
            [name, email, hashedPassword],
            function (err) {
                if (err) {
                    console.error('Error inserting into Users table:', err.message);
                    return res.status(500).json({ error: `User table error: ${err.message}` });
                }

                const userId = this.lastID;
                console.log(`User created with ID: ${userId}`);

                db.run(`INSERT INTO Students (user_id, name, course, phone, guardian_name, guardian_contact, address, gender, approval_status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
                    [userId, name, course, phone, guardian_name || '', guardian_contact || '', address || '', gender || 'male'],
                    function (err2) {
                        if (err2) {
                            console.error('Error inserting into Students table:', err2.message);
                            return res.status(500).json({ error: `Student table error: ${err2.message}` });
                        }

                        console.log(`Student record created and approved with ID: ${this.lastID}`);
                        res.json({ id: this.lastID, name, email, course });
                    });
            });
    } catch (error) {
        console.error('Catch block error in addStudent:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteStudent = (req, res) => {
    const { id } = req.params;
    db.get('SELECT user_id FROM Students WHERE student_id = ?', [id], (err, student) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        // First, free up the bed in the allocated room (if any)
        db.get('SELECT room_id FROM Allocations WHERE student_id = ?', [id], (err2, alloc) => {
            if (!err2 && alloc && alloc.room_id) {
                db.run('UPDATE Rooms SET available_beds = available_beds + 1 WHERE id = ?', [alloc.room_id]);
            }
            db.serialize(() => {
                db.run('DELETE FROM Allocations WHERE student_id = ?', [id]);
                db.run('DELETE FROM Fees WHERE student_id = ?', [id]);
                db.run('DELETE FROM Complaints WHERE student_id = ?', [id]);
                db.run('DELETE FROM Students WHERE student_id = ?', [id]);
                db.run('DELETE FROM Users WHERE id = ?', [student.user_id], function (err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ message: 'Student deleted successfully' });
                });
            });
        });
    });
};

exports.editStudent = (req, res) => {
    const { id } = req.params;
    const { name, email, course, phone, guardian_name, guardian_contact, address, gender, alloc_room_id } = req.body;
    
    db.serialize(() => {
        // 1. Update Students and Users table
        db.run(
            'UPDATE Students SET name = ?, course = ?, phone = ?, guardian_name = ?, guardian_contact = ?, address = ?, gender = ? WHERE student_id = ?',
            [name, course, phone, guardian_name, guardian_contact, address, gender, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                db.get('SELECT user_id FROM Students WHERE student_id = ?', [id], (err, row) => {
                    if (err || !row) return res.status(500).json({ error: err ? err.message : 'Student user record not found' });
                    db.run('UPDATE Users SET name = ?, email = ? WHERE id = ?', [name, email, row.user_id], function(err2) {
                        if (err2) return res.status(500).json({ error: err2.message });
                        
                        // 2. Handle room allocation changes
                        if (alloc_room_id !== undefined) {
                            db.get('SELECT room_id FROM Allocations WHERE student_id = ?', [id], (err3, currentAlloc) => {
                                const newRoomId = alloc_room_id ? parseInt(alloc_room_id) : null;
                                const oldRoomId = currentAlloc ? currentAlloc.room_id : null;
                                
                                if (oldRoomId === newRoomId) {
                                    return res.json({ message: 'Student updated successfully', id, name, course, phone });
                                }

                                const updateAllocations = () => {
                                    // Remove old allocation if exists
                                    if (oldRoomId) {
                                        db.run('UPDATE Rooms SET available_beds = available_beds + 1 WHERE id = ?', [oldRoomId]);
                                        db.run('DELETE FROM Allocations WHERE student_id = ?', [id]);
                                    }
                                    
                                    // Set new allocation if exists
                                    if (newRoomId) {
                                        db.run('INSERT INTO Allocations (student_id, room_id) VALUES (?, ?)', [id, newRoomId]);
                                        db.run('UPDATE Rooms SET available_beds = available_beds - 1 WHERE id = ?', [newRoomId], function(err4) {
                                            if (err4) return res.status(500).json({ error: err4.message });
                                            return res.json({ message: 'Student and allocation updated successfully' });
                                        });
                                    } else {
                                        return res.json({ message: 'Student updated (unassigned room)' });
                                    }
                                };

                                // Ensure new room actually has capacity before doing anything
                                if (newRoomId) {
                                    db.get('SELECT available_beds FROM Rooms WHERE id = ?', [newRoomId], (err5, room) => {
                                        if (err5) return res.status(500).json({ error: err5.message });
                                        if (!room || room.available_beds <= 0) return res.status(400).json({ error: 'Selected room is full or does not exist' });
                                        updateAllocations();
                                    });
                                } else {
                                    updateAllocations();
                                }
                            });
                        } else {
                            res.json({ message: 'Student updated successfully', id, name, course, phone });
                        }
                    });
                });
            }
        );
    });
};

exports.generateFee = (req, res) => {
    const { student_id, amount, month, year } = req.body;
    db.run('INSERT INTO Fees (student_id, amount, payment_status, month, year) VALUES (?, ?, "pending", ?, ?)',
        [student_id, amount, month, year], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, student_id, amount, status: 'pending', month, year });
        });
};

exports.generateBulkFee = (req, res) => {
    const { hostel_id, amount, month, year } = req.body;
    if (!hostel_id || !amount || !month || !year) {
        return res.status(400).json({ error: 'hostel_id, amount, month, and year are required.' });
    }

    const query = `
        SELECT DISTINCT s.student_id
        FROM Students s
        INNER JOIN Allocations a ON s.student_id = a.student_id
        INNER JOIN Rooms r ON a.room_id = r.id
        WHERE r.hostel_id = ?
    `;

    db.all(query, [hostel_id], (err, students) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!students.length) return res.status(404).json({ error: 'No students allocated in this hostel.' });

        const stmt = db.prepare('INSERT INTO Fees (student_id, amount, payment_status, month, year) VALUES (?, ?, "pending", ?, ?)');
        let count = 0;
        students.forEach(s => {
            stmt.run([s.student_id, amount, month, year], (err) => { if (!err) count++; });
        });
        stmt.finalize(() => {
            res.json({ message: `Fees generated for ${count} student(s) in the hostel.`, count });
        });
    });
};

exports.applyFine = (req, res) => {
    const { id } = req.params;
    const { fine_amount } = req.body;
    db.run('UPDATE Fees SET late_fine = late_fine + ? WHERE fee_id = ?', [fine_amount, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Late fine applied successfully' });
    });
};

exports.sendWarning = (req, res) => {
    const { id } = req.params;
    db.run('UPDATE Fees SET warning_sent = 1 WHERE fee_id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Warning marked as sent' });
    });
};

exports.editFee = (req, res) => {
    const { id } = req.params;
    const { amount, month, year, payment_status } = req.body;
    db.run(
        'UPDATE Fees SET amount = ?, month = ?, year = ?, payment_status = ? WHERE fee_id = ?',
        [amount, month, year, payment_status, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Fee record not found' });
            res.json({ message: 'Fee updated successfully' });
        }
    );
};

exports.deleteFee = (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM Fees WHERE fee_id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Fee record not found' });
        res.json({ message: 'Fee deleted successfully' });
    });
};

exports.getAllFees = (req, res) => {
    console.log('Fetching all fee records...');
    db.all(`
        SELECT Fees.*, Students.name as student_name 
        FROM Fees 
        JOIN Students ON Fees.student_id = Students.student_id
        ORDER BY Fees.fee_id DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching all fees:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Fetched ${rows.length} fee records`);
        res.json(rows);
    });
};

// ---- WARDENS ----
exports.getWardens = (req, res) => {
    console.log('Fetching all wardens...');
    db.all(`
        SELECT Users.id, Users.name, Users.email, Users.role, Users.hostel_id, Hostels.name as hostel_name 
        FROM Users 
        LEFT JOIN Hostels ON Users.hostel_id = Hostels.hostel_id
        WHERE Users.role = "warden"
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching wardens:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
};

exports.addWarden = async (req, res) => {
    const { name, email, password, hostel_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const hostId = hostel_id ? parseInt(hostel_id) : null;
        db.run('INSERT INTO Users (name, email, password, role, hostel_id) VALUES (?, ?, ?, "warden", ?)', 
            [name, email, hashedPassword, hostId], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, name, email, role: 'warden', hostel_id: hostId });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.editWarden = async (req, res) => {
    const { id } = req.params;
    const { name, email, hostel_id } = req.body;
    const hostId = hostel_id ? parseInt(hostel_id) : null;
    db.run(
        'UPDATE Users SET name = ?, email = ?, hostel_id = ? WHERE id = ? AND role = "warden"',
        [name, email, hostId, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Warden not found' });
            res.json({ message: 'Warden updated successfully' });
        }
    );
};

exports.deleteWarden = (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM Users WHERE id = ? AND role = "warden"', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Warden not found' });
        res.json({ message: 'Warden deleted successfully' });
    });
};

// ---- APPLICATIONS / APPROVALS ----
exports.getStudents = (req, res) => {
    console.log('Fetching all students...');
    db.all(`
        SELECT Students.*, Users.email, Rooms.room_no, Rooms.id as alloc_room_id, Rooms.hostel_id as alloc_hostel_id, Hostels.name as hostel_name 
        FROM Students 
        JOIN Users ON Students.user_id = Users.id 
        LEFT JOIN Allocations ON Students.student_id = Allocations.student_id
        LEFT JOIN Rooms ON Allocations.room_id = Rooms.id
        LEFT JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
        WHERE Students.approval_status = "approved"
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching pending applications:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
};

exports.getPendingApplications = (req, res) => {
    console.log('Fetching pending applications...');
    db.all(`
        SELECT Students.*, Users.email, Fees.payment_status as reg_fee_status, Hostels.name as preferred_hostel_name 
        FROM Students 
        JOIN Users ON Students.user_id = Users.id 
        LEFT JOIN Fees ON Fees.student_id = Students.student_id
        LEFT JOIN Hostels ON Students.preferred_hostel = Hostels.hostel_id
        WHERE Students.approval_status = "pending"
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching pending applications:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
};

exports.approveApplication = (req, res) => {
    const { id } = req.params;
    db.run('UPDATE Students SET approval_status = "approved" WHERE student_id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Application not found' });
        res.json({ message: 'Application approved successfully' });
    });
};

exports.rejectApplication = (req, res) => {
    const { id } = req.params;
    db.run('UPDATE Students SET approval_status = "rejected" WHERE student_id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Application not found' });
        res.json({ message: 'Application rejected successfully' });
    });
};

// Approve + allocate to a specific room in one atomic operation
exports.approveWithRoom = (req, res) => {
    const { id } = req.params;   // student_id
    const { room_id } = req.body;

    if (!room_id) return res.status(400).json({ error: 'room_id is required' });

    // Verify room has free beds
    db.get('SELECT * FROM Rooms WHERE id = ?', [room_id], (err, room) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        if (room.available_beds <= 0) return res.status(400).json({ error: 'No available beds in this room' });

        db.serialize(() => {
            // Approve student
            db.run('UPDATE Students SET approval_status = "approved" WHERE student_id = ?', [id]);
            // Insert allocation
            db.run('INSERT INTO Allocations (student_id, room_id) VALUES (?, ?)', [id, room_id]);
            // Decrement available beds
            db.run('UPDATE Rooms SET available_beds = available_beds - 1 WHERE id = ?', [room_id], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'Application approved and student allocated successfully' });
            });
        });
    });
};
