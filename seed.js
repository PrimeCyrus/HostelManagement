const db = require('./database/database');
const bcrypt = require('bcrypt');

async function seed() {
    console.log('Starting seed process...');
    const hashedAdminPw = await bcrypt.hash('admin123', 10);
    const hashedWardenPw = await bcrypt.hash('warden123', 10);
    const hashedStudentPw = await bcrypt.hash('student123', 10);

    db.serialize(() => {
        db.run(`INSERT INTO Users (name, email, password, role) VALUES ('Admin User', 'admin@example.com', ?, 'admin')`, [hashedAdminPw]);
        db.run(`INSERT INTO Users (name, email, password, role) VALUES ('Warden User', 'warden@example.com', ?, 'warden')`, [hashedWardenPw]);
        db.run(`INSERT INTO Users (name, email, password, role) VALUES ('Student User', 'student@example.com', ?, 'student')`, [hashedStudentPw], function (err) {
            if (err) {
                console.error(err);
            } else {
                const studentUserId = this.lastID;
                db.run(`INSERT INTO Students (user_id, name, course, phone) VALUES (?, 'Student User', 'B.Tech', '1234567890')`, [studentUserId]);
            }
        });

        db.run(`INSERT INTO Hostels (name) VALUES ('Alpha Hostel')`);
        db.run(`INSERT INTO Hostels (name) VALUES ('Beta Hostel')`);

        db.run(`INSERT INTO Rooms (room_no, hostel_id, capacity, available_beds) VALUES ('101', 1, 2, 2)`);
        db.run(`INSERT INTO Rooms (room_no, hostel_id, capacity, available_beds) VALUES ('102', 1, 3, 3)`);

        console.log('Seed process finished. You can exit now.');
    });
}

// Timeout to ensure DB connection is ready
setTimeout(seed, 1000);
