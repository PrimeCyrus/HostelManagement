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
            role TEXT CHECK(role IN ('admin', 'warden', 'student')) NOT NULL
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
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )`);

        // Hostels Table
        db.run(`CREATE TABLE IF NOT EXISTS Hostels (
            hostel_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )`);

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
            FOREIGN KEY(student_id) REFERENCES Students(student_id)
        )`);

        // Migration to add razorpay_order_id if it doesn't exist (for existing tables)
        db.all("PRAGMA table_info(Fees)", (err, rows) => {
            if (err) return;
            const hasOrderId = rows.some(r => r.name === 'razorpay_order_id');
            if (!hasOrderId) {
                db.run("ALTER TABLE Fees ADD COLUMN razorpay_order_id TEXT");
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

        console.log('Tables created or verified.');
    });
}

module.exports = db;
