const db = require('../database/database');

/**
 * GET /api/public/hostels
 * Returns all hostels with live seat availability.
 * Pending applications for each hostel count as occupied seats.
 */
exports.getHostelAvailability = (req, res) => {
    const sql = `
        SELECT
            h.hostel_id,
            h.name,
            h.gender,
            h.location,
            h.facilities,
            COALESCE(SUM(r.capacity), 0)       AS total_capacity,
            COALESCE(SUM(r.capacity) - SUM(r.available_beds), 0) AS allocated_seats,
            (
                SELECT COUNT(*) FROM Students s
                WHERE s.preferred_hostel = h.hostel_id
                  AND s.approval_status = 'pending'
            ) AS pending_applications
        FROM Hostels h
        LEFT JOIN Rooms r ON r.hostel_id = h.hostel_id
        GROUP BY h.hostel_id
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const result = rows.map(h => ({
            hostel_id:    h.hostel_id,
            name:         h.name,
            gender:       h.gender || 'mixed',
            location:     h.location,
            facilities:   h.facilities,
            total_capacity:      h.total_capacity,
            seats_taken:        h.allocated_seats + h.pending_applications,
            seats_available:    Math.max(0, h.total_capacity - h.allocated_seats - h.pending_applications),
            pending_applications: h.pending_applications
        }));

        res.json(result);
    });
};

/**
 * GET /api/public/hostels/available?gender=male
 * Returns gender-filtered hostels that have at least one room with free beds.
 * Used by admin approval flow.
 */
exports.getAvailableHostels = (req, res) => {
    const { gender } = req.query; // 'male' | 'female'

    let genderFilter = '';
    const params = [];
    if (gender) {
        genderFilter = `WHERE (h.gender = ? OR h.gender = 'mixed')`;
        params.push(gender);
    }

    const sql = `
        SELECT
            h.hostel_id, h.name, h.gender,
            r.id as room_id, r.room_no, r.available_beds
        FROM Hostels h
        JOIN Rooms r ON r.hostel_id = h.hostel_id
        ${genderFilter}
        AND r.available_beds > 0
        ORDER BY h.hostel_id, r.room_no
    `;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Group rooms under each hostel
        const hostelsMap = {};
        rows.forEach(r => {
            if (!hostelsMap[r.hostel_id]) {
                hostelsMap[r.hostel_id] = {
                    hostel_id: r.hostel_id,
                    name: r.name,
                    gender: r.gender,
                    rooms: []
                };
            }
            hostelsMap[r.hostel_id].rooms.push({
                room_id: r.room_id,
                room_no: r.room_no,
                available_beds: r.available_beds
            });
        });

        res.json(Object.values(hostelsMap));
    });
};
