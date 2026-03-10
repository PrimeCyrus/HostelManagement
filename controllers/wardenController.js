const db = require('../database/database');

exports.getStats = (req, res) => {
    const stats = {};
    db.get('SELECT COUNT(*) as count FROM Students', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.students = row.count;
        db.get('SELECT COUNT(*) as count FROM Rooms', (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.rooms = row.count;
            db.get('SELECT SUM(available_beds) as count FROM Rooms', (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.availableBeds = row.count || 0;
                db.get('SELECT COUNT(*) as count FROM Complaints WHERE status = "pending"', (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.pendingComplaints = row.count;
                    res.json(stats);
                });
            });
        });
    });
};

exports.getRooms = (req, res) => {
    db.all(`
        SELECT Rooms.*, Hostels.name as hostel_name 
        FROM Rooms 
        JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getStudents = (req, res) => {
    db.all(`
        SELECT Students.*, Users.email, Rooms.room_no, Hostels.name as hostel_name, Allocations.allocation_id
        FROM Students 
        JOIN Users ON Students.user_id = Users.id
        LEFT JOIN Allocations ON Students.student_id = Allocations.student_id
        LEFT JOIN Rooms ON Allocations.room_id = Rooms.id
        LEFT JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getComplaints = (req, res) => {
    db.all(`
        SELECT Complaints.*, Students.name as student_name 
        FROM Complaints 
        JOIN Students ON Complaints.student_id = Students.student_id
    `, [], (err, rows) => {
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

exports.getFees = (req, res) => {
    db.all(`
        SELECT Fees.*, Students.name as student_name 
        FROM Fees 
        JOIN Students ON Fees.student_id = Students.student_id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};
