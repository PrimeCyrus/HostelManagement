const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'payment.html'));
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/warden', require('./routes/wardenRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));

// Dashboard views
const { requireRole } = require('./middleware/authMiddleware');

app.get('/admin-dashboard', requireRole('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/warden-dashboard', requireRole('warden'), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'warden-dashboard.html'));
});

app.get('/student-dashboard', requireRole('student'), (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize database
    require('./database/database');
    // Initialize monthly fee automation
    require('./services/feeService');
});
