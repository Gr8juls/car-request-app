const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('Car Request App API Running');
});

const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/carRequests');
const departmentRoutes = require('./routes/departments');
const vehiclesRoutes = require('./routes/vehicles');
const driversRoutes = require('./routes/driversManagement');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers_management', driversRoutes);
app.use('/api/notifications', notificationRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
