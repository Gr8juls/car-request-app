const pool = require('../config/db');

exports.getDrivers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM drivers WHERE is_active = 1 ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching drivers' });
    }
};

exports.createDriver = async (req, res) => {
    const { full_name, phone } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO drivers (full_name, phone) VALUES (?, ?)', [full_name, phone || null]);
        res.status(201).json({ id: result.insertId, full_name, phone, is_active: 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating driver' });
    }
};

exports.updateDriver = async (req, res) => {
    const { id } = req.params;
    const { full_name, phone } = req.body;
    try {
        await pool.query('UPDATE drivers SET full_name = ?, phone = ? WHERE id = ?', [full_name, phone || null, id]);
        res.json({ id: parseInt(id), full_name, phone });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating driver' });
    }
};

exports.deleteDriver = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE drivers SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Driver deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting driver' });
    }
};
