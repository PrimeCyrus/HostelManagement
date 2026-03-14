const db = require('../database/database');

exports.getProfile = (req, res) => {
    db.get(`
        SELECT Students.*, Users.email 
        FROM Students 
        JOIN Users ON Students.user_id = Users.id 
        WHERE Users.id = ?
    `, [req.session.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
};

exports.updateProfile = (req, res) => {
    const { phone, guardian_name, guardian_contact, address } = req.body;
    db.run(
        'UPDATE Students SET phone = ?, guardian_name = ?, guardian_contact = ?, address = ? WHERE user_id = ?',
        [phone, guardian_name, guardian_contact, address, req.session.userId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Profile updated successfully' });
        }
    );
};

exports.getRoom = (req, res) => {
    db.get(`
        SELECT Allocations.*, Rooms.capacity, Rooms.room_no, Hostels.name as hostel_name 
        FROM Allocations 
        JOIN Students ON Allocations.student_id = Students.student_id
        JOIN Rooms ON Allocations.room_id = Rooms.id
        JOIN Hostels ON Rooms.hostel_id = Hostels.hostel_id
        WHERE Students.user_id = ?
    `, [req.session.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { message: "No room allocated yet" });
    });
};

exports.getFees = (req, res) => {
    db.all(`
        SELECT Fees.* 
        FROM Fees 
        JOIN Students ON Fees.student_id = Students.student_id
        WHERE Students.user_id = ?
    `, [req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.getComplaints = (req, res) => {
    db.all(`
        SELECT Complaints.* 
        FROM Complaints 
        JOIN Students ON Complaints.student_id = Students.student_id
        WHERE Students.user_id = ?
    `, [req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.submitComplaint = (req, res) => {
    const { description } = req.body;
    db.get(`SELECT student_id FROM Students WHERE user_id = ?`, [req.session.userId], (err, student) => {
        if (err || !student) return res.status(500).json({ error: "Student not found" });
        db.run(`INSERT INTO Complaints (student_id, description) VALUES (?, ?)`, [student.student_id, description], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, description, status: 'pending' });
        });
    });
};

exports.payFee = (req, res) => {
    const { id } = req.params; // fee_id
    const payment_date = new Date().toISOString().split('T')[0];
    db.run('UPDATE Fees SET payment_status = "paid", payment_date = ? WHERE fee_id = ?',
        [payment_date, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Fee paid successfully" });
        });
};

exports.getLeaves = (req, res) => {
    db.all(`
        SELECT leave_requests.* 
        FROM leave_requests 
        JOIN Students ON leave_requests.student_id = Students.student_id
        WHERE Students.user_id = ?
        ORDER BY created_at DESC
    `, [req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.submitLeave = (req, res) => {
    const { destination, reason, start_date, end_date } = req.body;
    db.get(`SELECT student_id FROM Students WHERE user_id = ?`, [req.session.userId], (err, student) => {
        if (err || !student) return res.status(500).json({ error: "Student not found" });
        db.run(`INSERT INTO leave_requests (student_id, destination, reason, start_date, end_date) VALUES (?, ?, ?, ?, ?)`, 
        [student.student_id, destination, reason, start_date, end_date], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, destination, reason, start_date, end_date, status: 'pending' });
        });
    });
};

// ─── MOCK Razorpay (Test Mode) ────────────────────────────────────────────────
// This is a simulated payment flow. No real Razorpay account is required.
// Swap these two exports with real Razorpay SDK calls when going live.
const crypto = require('crypto');
const MOCK_KEY_ID = 'rzp_test_mock_key';
const MOCK_SECRET = 'mock_secret_for_test';

exports.createRazorpayOrder = (req, res) => {
    const { fee_id } = req.body;
    db.get('SELECT amount FROM Fees WHERE fee_id = ? AND payment_status = "pending"', [fee_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Fee record not found or already paid' });

        // Build a fake order ID (mock)
        const orderId = `order_mock_${Date.now()}_${fee_id}`;
        // Sign order so the verify step can confirm it came from us
        const mockSignature = crypto
            .createHmac('sha256', MOCK_SECRET)
            .update(orderId)
            .digest('hex');

        db.run('UPDATE Fees SET razorpay_order_id = ? WHERE fee_id = ?', [orderId, fee_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                order_id:   orderId,
                amount:     row.amount * 100,  // paise
                currency:   'INR',
                key_id:     MOCK_KEY_ID,
                mock:       true,              // tells the front-end to use the mock checkout
                mock_sig:   mockSignature      // pre-computed signature for automatic verification
            });
        });
    });
};

exports.verifyRazorpayPayment = (req, res) => {
    const { razorpay_order_id, fee_id, mock } = req.body;

    if (mock) {
        // Mock path: trust the front-end's indication that the mock succeeded
        db.run(
            'UPDATE Fees SET payment_status = "paid", payment_date = ? WHERE fee_id = ?',
            [new Date().toISOString().split('T')[0], fee_id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: 'Mock payment verified and fee marked as paid' });
            }
        );
    } else {
        // Real Razorpay path (future use)
        const { razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSig = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || MOCK_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSig !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }
        db.run(
            'UPDATE Fees SET payment_status = "paid", payment_date = ? WHERE fee_id = ?',
            [new Date().toISOString().split('T')[0], fee_id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: 'Payment verified and fee updated' });
            }
        );
    }
};
