const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hostel.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT CHECK(role IN ('admin', 'warden', 'student')) NOT NULL,
            hostel_id INTEGER
        )`);

        // Students Table
        db.run(`CREATE TABLE IF NOT EXISTS Students (
            student_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            course TEXT,
            phone TEXT,
            guardian_name TEXT,
            guardian_contact TEXT,
            address TEXT,
            gender TEXT CHECK(gender IN ('male','female')) DEFAULT 'male',
            approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
            preferred_hostel INTEGER,
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )`);

        // Migration to add approval_status if it doesn't exist (for existing tables)
        db.all("PRAGMA table_info(Students)", (err, rows) => {
            if (err) return;
            const hasApprovalStatus = rows.some(r => r.name === 'approval_status');
            if (!hasApprovalStatus) {
                db.run("ALTER TABLE Students ADD COLUMN approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved'");
            }
            const hasPref = rows.some(r => r.name === 'preferred_hostel');
            if (!hasPref) {
                db.run("ALTER TABLE Students ADD COLUMN preferred_hostel INTEGER");
            }
            const hasGender = rows.some(r => r.name === 'gender');
            if (!hasGender) {
                db.run("ALTER TABLE Students ADD COLUMN gender TEXT DEFAULT 'male'");
            }
        });

        // Hostels Table
        db.run(`CREATE TABLE IF NOT EXISTS Hostels (
            hostel_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            facilities TEXT,
            gender TEXT CHECK(gender IN ('male','female','mixed')) DEFAULT 'mixed'
        )`);

        // Migration for Hostels table
        db.all("PRAGMA table_info(Hostels)", (err, rows) => {
            if (err) return;
            const hasLocation = rows.some(r => r.name === 'location');
            if (!hasLocation) {
                db.run("ALTER TABLE Hostels ADD COLUMN location TEXT DEFAULT 'Central Campus Area'");
                db.run("ALTER TABLE Hostels ADD COLUMN facilities TEXT DEFAULT 'High-Speed Wi-Fi | 24/7 Security | Laundry Service | Common Lounge | Dining Hall | Gym Access'");
            }
            const hasGender = rows.some(r => r.name === 'gender');
            if (!hasGender) {
                db.run("ALTER TABLE Hostels ADD COLUMN gender TEXT DEFAULT 'mixed'");
            }
        });

        // Rooms Table
        db.run(`CREATE TABLE IF NOT EXISTS Rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_no TEXT NOT NULL,
            hostel_id INTEGER,
            capacity INTEGER NOT NULL,
            available_beds INTEGER NOT NULL,
            FOREIGN KEY(hostel_id) REFERENCES Hostels(hostel_id)
        )`);

        // Allocations Table
        db.run(`CREATE TABLE IF NOT EXISTS Allocations (
            allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            room_id INTEGER,
            bed_number INTEGER,
            FOREIGN KEY(student_id) REFERENCES Students(student_id),
            FOREIGN KEY(room_id) REFERENCES Rooms(id)
        )`);

        // Fees Table
        db.run(`CREATE TABLE IF NOT EXISTS Fees (
            fee_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            amount REAL NOT NULL,
            payment_status TEXT CHECK(payment_status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
            payment_date TEXT,
            razorpay_order_id TEXT,
            month TEXT,
            year INTEGER,
            late_fine REAL DEFAULT 0,
            warning_sent INTEGER DEFAULT 0,
            FOREIGN KEY(student_id) REFERENCES Students(student_id)
        )`);

        // Migration to add missing columns if they don't exist (for existing tables)
        db.all("PRAGMA table_info(Fees)", (err, rows) => {
            if (err) return;
            const hasOrderId = rows.some(r => r.name === 'razorpay_order_id');
            if (!hasOrderId) {
                db.run("ALTER TABLE Fees ADD COLUMN razorpay_order_id TEXT");
            }
            const hasMonth = rows.some(r => r.name === 'month');
            if (!hasMonth) {
                db.run("ALTER TABLE Fees ADD COLUMN month TEXT");
                db.run("ALTER TABLE Fees ADD COLUMN year INTEGER");
                db.run("ALTER TABLE Fees ADD COLUMN late_fine REAL DEFAULT 0");
                db.run("ALTER TABLE Fees ADD COLUMN warning_sent INTEGER DEFAULT 0");
            }
        });

        // Complaints Table
        db.run(`CREATE TABLE IF NOT EXISTS Complaints (
            complaint_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            description TEXT NOT NULL,
            status TEXT CHECK(status IN ('pending', 'resolved')) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES Students(student_id)
        )`);

        // Leave Requests Table
        db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
            leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            destination TEXT NOT NULL,
            reason TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status TEXT CHECK(status IN ('pending', 'approved', 'denied', 'completed')) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES Students(student_id)
        )`);

        console.log('Tables created or verified.');

        // ── Heal stale available_beds counts ──────────────────────────────────
        // Recalculate available_beds for every room based on actual Allocations.
        // This corrects any drift caused by student deletions that didn't free beds.
        db.run(`
            UPDATE Rooms
            SET available_beds = capacity - (
                SELECT COUNT(*) FROM Allocations WHERE Allocations.room_id = Rooms.id
            )
        `, (err) => {
            if (err) console.error('⚠ Could not heal available_beds:', err.message);
            else console.log('✔ Room bed counts recalculated from Allocations.');
        });
    });
}

module.exports = db;
