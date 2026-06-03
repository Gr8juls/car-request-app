const pool = require('../config/db');

exports.getVehicles = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vehicles WHERE is_active = 1 ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching vehicles' });
    }
};

exports.createVehicle = async (req, res) => {
    const { vehicle_name, reg_no } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO vehicles (vehicle_name, reg_no) VALUES (?, ?)', [vehicle_name, reg_no]);
        res.status(201).json({ id: result.insertId, vehicle_name, reg_no, is_active: 1 });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'A vehicle with this registration number already exists.' });
        }
        res.status(500).json({ message: 'Server error creating vehicle' });
    }
};

exports.updateVehicle = async (req, res) => {
    const { id } = req.params;
    const { vehicle_name, reg_no } = req.body;
    try {
        await pool.query('UPDATE vehicles SET vehicle_name = ?, reg_no = ? WHERE id = ?', [vehicle_name, reg_no, id]);
        res.json({ id: parseInt(id), vehicle_name, reg_no });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'A vehicle with this registration number already exists.' });
        }
        res.status(500).json({ message: 'Server error updating vehicle' });
    }
};

exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE vehicles SET is_active = 0 WHERE id = ?', [id]);
        res.json({ message: 'Vehicle deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting vehicle' });
    }
};
