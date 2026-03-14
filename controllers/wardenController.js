const db = require('../database/database');

exports.getStats = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.status(403).json({ error: "No hostel assigned to this warden" });

    const stats = {};
    db.get('SELECT COUNT(*) as count FROM Students JOIN Allocations ON Students.student_id = Allocations.student_id JOIN Rooms ON Allocations.room_id = Rooms.id WHERE Rooms.hostel_id = ?', [hostelId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.students = row ? row.count : 0;
        db.get('SELECT COUNT(*) as count FROM Rooms WHERE hostel_id = ?', [hostelId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.rooms = row ? row.count : 0;
            db.get('SELECT SUM(available_beds) as count FROM Rooms WHERE hostel_id = ?', [hostelId], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.availableBeds = row ? row.count : 0;
                db.get(`
                    SELECT COUNT(*) as count FROM Complaints 
                    JOIN Students ON Complaints.student_id = Students.student_id 
                    JOIN Allocations ON Students.student_id = Allocations.student_id 
                    JOIN Rooms ON Allocations.room_id = Rooms.id 
                    WHERE Complaints.status = "pending" AND Rooms.hostel_id = ?
                `, [hostelId], (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.pendingComplaints = row ? row.count : 0;
                    res.json(stats);
                });
            });
        });
    });
};

exports.getRooms = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.json([]);
    db.all(`
        SELECT Rooms.*, Hostels.name as hostel_name 
        FROM Rooms 
        JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
        WHERE Rooms.hostel_id = ?
    `, [hostelId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getStudents = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.json([]);
    db.all(`
        SELECT Students.*, Users.email, Rooms.room_no, Rooms.id as room_id, Hostels.name as hostel_name, Allocations.allocation_id
        FROM Students 
        JOIN Users ON Students.user_id = Users.id
        JOIN Allocations ON Students.student_id = Allocations.student_id
        JOIN Rooms ON Allocations.room_id = Rooms.id
        JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
        WHERE Rooms.hostel_id = ?
    `, [hostelId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getComplaints = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.json([]);
    db.all(`
        SELECT Complaints.*, Students.name as student_name 
        FROM Complaints 
        JOIN Students ON Complaints.student_id = Students.student_id
        JOIN Allocations ON Students.student_id = Allocations.student_id
        JOIN Rooms ON Allocations.room_id = Rooms.id
        WHERE Rooms.hostel_id = ?
    `, [hostelId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.updateComplaint = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run(`UPDATE Complaints SET status = ? WHERE complaint_id = ?`, [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Complaint updated" });
    });
};

exports.allocateRoom = (req, res) => {
    const { student_id, room_id } = req.body;

    db.get('SELECT available_beds FROM Rooms WHERE id = ?', [room_id], (err, room) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!room) return res.status(404).json({ error: "Room not found" });
        if (room.available_beds <= 0) return res.status(400).json({ error: "No beds available" });

        db.serialize(() => {
            db.run('INSERT INTO Allocations (student_id, room_id) VALUES (?, ?)', [student_id, room_id]);
            db.run('UPDATE Rooms SET available_beds = available_beds - 1 WHERE id = ?', [room_id]);
        });
        res.json({ message: "Room allocated successfully" });
    });
};

exports.deallocateRoom = (req, res) => {
    const { id } = req.params; // allocation_id

    db.get('SELECT room_id FROM Allocations WHERE allocation_id = ?', [id], (err, alloc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!alloc) return res.status(404).json({ error: "Allocation not found" });

        db.serialize(() => {
            db.run('DELETE FROM Allocations WHERE allocation_id = ?', [id]);
            db.run('UPDATE Rooms SET available_beds = available_beds + 1 WHERE id = ?', [alloc.room_id]);
        });
        res.json({ message: "Room deallocated successfully" });
    });
};

exports.reallocateRoom = (req, res) => {
    const { id } = req.params; // allocation_id
    const { new_room_id } = req.body;
    const hostelId = req.session.hostel_id;

    if (!hostelId) return res.status(403).json({ error: "No hostel assigned to this warden" });

    // Ensure the new room is in the warden's hostel
    db.get('SELECT available_beds, hostel_id FROM Rooms WHERE id = ?', [new_room_id], (err, newRoom) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!newRoom) return res.status(404).json({ error: "New room not found" });
        if (newRoom.hostel_id !== hostelId) return res.status(403).json({ error: "Cannot reallocate to a room outside your assigned hostel" });
        if (newRoom.available_beds <= 0) return res.status(400).json({ error: "No beds available in the selected room" });

        db.get('SELECT room_id FROM Allocations WHERE allocation_id = ?', [id], (err2, oldAlloc) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!oldAlloc) return res.status(404).json({ error: "Allocation not found" });

            const oldRoomId = oldAlloc.room_id;
            
            if (oldRoomId === parseInt(new_room_id)) {
                return res.json({ message: "Student is already in this room" });
            }

            db.serialize(() => {
                // Free up old bed
                db.run('UPDATE Rooms SET available_beds = available_beds + 1 WHERE id = ?', [oldRoomId]);
                // Occupy new bed
                db.run('UPDATE Rooms SET available_beds = available_beds - 1 WHERE id = ?', [new_room_id]);
                // Update allocation
                db.run('UPDATE Allocations SET room_id = ? WHERE allocation_id = ?', [new_room_id, id], function(err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ message: "Room reallocated successfully" });
                });
            });
        });
    });
};

exports.getFees = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.json([]);
    db.all(`
        SELECT Fees.*, Students.name as student_name 
        FROM Fees 
        JOIN Students ON Fees.student_id = Students.student_id
        JOIN Allocations ON Students.student_id = Allocations.student_id
        JOIN Rooms ON Allocations.room_id = Rooms.id
        WHERE Rooms.hostel_id = ?
    `, [hostelId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getLeaves = (req, res) => {
    const hostelId = req.session.hostel_id;
    if (!hostelId) return res.json([]);
    db.all(`
        SELECT leave_requests.*, Students.name as student_name 
        FROM leave_requests 
        JOIN Students ON leave_requests.student_id = Students.student_id
        JOIN Allocations ON Students.student_id = Allocations.student_id
        JOIN Rooms ON Allocations.room_id = Rooms.id
        WHERE Rooms.hostel_id = ?
        ORDER BY leave_requests.created_at DESC
    `, [hostelId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.updateLeaveStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run(`UPDATE leave_requests SET status = ? WHERE leave_id = ?`, [status, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Leave status updated" });
    });
};
