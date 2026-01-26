const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'car_request_app'
};

const getDbConnection = async () => {
    return await mysql.createConnection(dbConfig);
};

exports.getAllDepartments = async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const [departments] = await connection.query('SELECT * FROM departments ORDER BY name');
        res.json(departments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};

exports.getSubDepartments = async (req, res) => {
    const { department_id } = req.query;
    let connection;
    try {
        connection = await getDbConnection();
        let query = 'SELECT * FROM sub_departments';
        let params = [];

        if (department_id) {
            query += ' WHERE department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY name';

        const [subDepartments] = await connection.query(query, params);
        res.json(subDepartments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) await connection.end();
    }
};
