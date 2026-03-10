const db = require('../database/database');
const bcrypt = require('bcrypt');

class UserModel {
    static async createUser(name, email, password, role) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)`,
                [name, email, hashedPassword, role],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    static getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM Users WHERE email = ?`,
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    static getUserById(id) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM Users WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }
}

module.exports = UserModel;
