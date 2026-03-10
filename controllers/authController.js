const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.role = user.role;

        return res.status(200).json({
            message: 'Login successful',
            role: user.role,
            redirectUrl: `/${user.role}-dashboard` // e.g. /admin-dashboard
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        return res.redirect('/');
    });
};

exports.me = async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Not authenticated' });
    try {
        const user = await UserModel.getUserById(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Don't send password
        const { password, ...userData } = user;
        return res.json(userData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};
