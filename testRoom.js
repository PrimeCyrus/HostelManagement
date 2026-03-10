const http = require('http');

async function run() {
    // We can directly test the adminController function if we mock req res
    const adminController = require('./controllers/adminController');
    const req = { body: { hostel_id: '1', capacity: '2' } };
    const res = {
        status: (s) => ({
            json: (data) => console.log('STATUS', s, 'JSON', data)
        }),
        json: (data) => console.log('JSON', data)
    };
    adminController.addRoom(req, res);
}

run();
