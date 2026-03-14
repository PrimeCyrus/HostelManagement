const db = require('../database/database');
const bcrypt = require('bcrypt');

exports.registerStudent = async (req, res) => {
    const { name, email, password, course, phone, guardian_name, guardian_contact, address, preferred_hostel, gender } = req.body;
    
    try {
        // Check if user already exists
        db.get('SELECT id FROM Users WHERE email = ?', [email], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ error: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert into Users table
            db.run(`INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, 'student')`,
                [name, email, hashedPassword],
                function (err) {
                    if (err) return res.status(500).json({ error: `User table error: ${err.message}` });

                    const userId = this.lastID;

                    // Insert into Students table with pending status
                    db.run(`INSERT INTO Students (user_id, name, course, phone, guardian_name, guardian_contact, address, gender, approval_status, preferred_hostel) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
                        [userId, name, course, phone, guardian_name, guardian_contact, address, gender || 'male', preferred_hostel || null],
                        function (err2) {
                            if (err2) return res.status(500).json({ error: `Student table error: ${err2.message}` });
                            
                            const studentId = this.lastID;
                            const registrationFee = 100; // Registration application fee

                            // Generate initial registration fee
                            db.run(`INSERT INTO Fees (student_id, amount, payment_status) VALUES (?, ?, 'pending')`,
                                [studentId, registrationFee],
                                function(err3) {
                                    if (err3) return res.status(500).json({ error: `Fee table error: ${err3.message}` });
                                    
                                    // Log them in immediately to session so they can pay the fee
                                    req.session.userId = userId;
                                    req.session.role = 'student';

                                    res.status(201).json({ 
                                        message: 'Registration successful', 
                                        student_id: studentId,
                                        fee_id: this.lastID,
                                        fee_amount: registrationFee,
                                        redirectUrl: '/payment'
                                    });
                                }
                            );
                        });
                });
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
