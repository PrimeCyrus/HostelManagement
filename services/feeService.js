const cron = require('node-cron');
const db = require('../database/database');

const generateMonthlyFees = () => {
    console.log('Running monthly fee generation job...');
    const amount = 5000; // Default monthly fee
    const status = 'pending';

    const now = new Date();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
    const currentMonth = monthFormatter.format(now);
    const currentYear = now.getFullYear();

    db.all('SELECT student_id FROM Students', [], (err, students) => {
        if (err) {
            console.error('Error fetching students for fee generation:', err.message);
            return;
        }

        students.forEach(student => {
            db.run(
                'INSERT INTO Fees (student_id, amount, payment_status, month, year) VALUES (?, ?, ?, ?, ?)',
                [student.student_id, amount, status, currentMonth, currentYear],
                (err) => {
                    if (err) {
                        console.error(`Error generating fee for student ${student.student_id}:`, err.message);
                    }
                }
            );
        });
        console.log(`Monthly fees generated for ${students.length} students.`);
    });
};

// Schedule job to run at 00:00 on the 1st of every month
// For testing purposes, you might want to run it more frequently, 
// but for production-like behavior: '0 0 1 * *'
cron.schedule('0 0 1 * *', generateMonthlyFees);

module.exports = {
    generateMonthlyFees // Exported so it can be manually triggered if needed
};
