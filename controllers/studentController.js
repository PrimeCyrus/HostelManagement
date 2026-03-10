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

const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_secret'
});

exports.createRazorpayOrder = (req, res) => {
    const { fee_id } = req.body;
    db.get('SELECT amount FROM Fees WHERE fee_id = ? AND payment_status = "pending"', [fee_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Fee record not found or already paid" });

        const options = {
            amount: row.amount * 100, // Amount in paise
            currency: "INR",
            receipt: `receipt_fee_${fee_id}`
        };

        razorpay.orders.create(options, (err, order) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run('UPDATE Fees SET razorpay_order_id = ? WHERE fee_id = ?', [order.id, fee_id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    order_id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    key_id: razorpay.key_id
                });
            });
        });
    });
};

exports.verifyRazorpayPayment = (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_id } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", razorpay.key_secret)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        db.run(
            'UPDATE Fees SET payment_status = "paid", payment_date = ? WHERE fee_id = ?',
            [new Date().toISOString().split('T')[0], fee_id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: "Payment verified and fee updated" });
            }
        );
    } else {
        res.status(400).json({ success: false, error: "Invalid payment signature" });
    }
};
