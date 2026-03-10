const db = require('../database/database');
const bcrypt = require('bcrypt');

// ---- STATS & OVERVIEW ----
exports.getStats = (req, res) => {
    console.log('Fetching Admin Stats...');
    const stats = {};
    db.get('SELECT COUNT(*) as count FROM Students', (err, row) => {
        if (err) {
            console.error('Error fetching students count:', err.message);
            return res.status(500).json({ error: err.message });
        }
        stats.students = row.count;
        db.get('SELECT COUNT(*) as count FROM Rooms', (err, row) => {
            if (err) {
                console.error('Error fetching rooms count:', err.message);
                return res.status(500).json({ error: err.message });
            }
            stats.rooms = row.count;
            db.get('SELECT COUNT(*) as count FROM Hostels', (err, row) => {
                if (err) {
                    console.error('Error fetching hostels count:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                stats.hostels = row.count;
                db.get('SELECT COUNT(*) as count FROM Complaints WHERE status = "pending"', (err, row) => {
                    if (err) {
                        console.error('Error fetching complaints count:', err.message);
                        return res.status(500).json({ error: err.message });
                    }
                    stats.complaints = row.count;
                    console.log('Admin Stats fetched successfully:', stats);
                    res.json(stats);
                });
            });
        });
    });
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
    const { name } = req.body;
    db.run('INSERT INTO Hostels (name) VALUES (?)', [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
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
    const { name, email, password, course, phone } = req.body;
    console.log(`Attempting to add student: ${email}`);

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

                db.run(`INSERT INTO Students (user_id, name, course, phone) VALUES (?, ?, ?, ?)`,
                    [userId, name, course, phone],
                    function (err2) {
                        if (err2) {
                            console.error('Error inserting into Students table:', err2.message);
                            return res.status(500).json({ error: `Student table error: ${err2.message}` });
                        }

                        console.log(`Student record created with ID: ${this.lastID}`);
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
        db.serialize(() => {
            db.run('DELETE FROM Allocations WHERE student_id = ?', [id]);
            db.run('DELETE FROM Fees WHERE student_id = ?', [id]);
            db.run('DELETE FROM Complaints WHERE student_id = ?', [id]);
            db.run('DELETE FROM Students WHERE student_id = ?', [id]);
            db.run('DELETE FROM Users WHERE id = ?', [student.user_id], function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'Student deleted successfully' });
            });
        });
    });
};

exports.generateFee = (req, res) => {
    const { student_id, amount } = req.body;
    db.run('INSERT INTO Fees (student_id, amount, payment_status) VALUES (?, ?, "pending")',
        [student_id, amount], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, student_id, amount, status: 'pending' });
        });
};

exports.getAllFees = (req, res) => {
    console.log('Fetching all fee records...');
    db.all(`
        SELECT Fees.*, Students.name as student_name 
        FROM Fees 
        JOIN Students ON Fees.student_id = Students.student_id
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching all fees:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Fetched ${rows.length} fee records`);
        res.json(rows);
    });
};
