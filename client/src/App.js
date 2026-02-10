import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import axios from 'axios';

import Navigation from './components/Navigation';
import Login from './components/Login';
import RequestForm from './components/RequestForm';
import HCDashboard from './components/HCDashboard';
import AdminDashboard from './components/AdminDashboard';
import Register from './components/Register';



import DriverDashboard from './components/DriverDashboard';
import Dashboard from './components/Dashboard';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const department = localStorage.getItem('department');
        const manager_level = localStorage.getItem('manager_level');
        if (token) {
            setUser({ token, role, department, manager_level });
        }
    }, []);

    // Add axios interceptor to handle 401 errors globally
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    // Token is invalid or expired, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('department');
                    localStorage.removeItem('manager_level');
                    setUser(null);
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptor on unmount
        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const handleLogin = (token, role, department, manager_level) => {
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('department', department);
        localStorage.setItem('manager_level', manager_level);
        setUser({ token, role, department, manager_level });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('department');
        localStorage.removeItem('manager_level');
        setUser(null);
    };

    const getDashboard = () => {
        if (!user) return <Navigate to="/login" />;
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
        if (user.role === 'driver') return <Navigate to="/driver-dashboard" />;
        if (user.role === 'hc' || user.department === 'Human Capital') return <Navigate to="/hc-dashboard" />;
        return <Dashboard user={user} />;
    };

    return (
        <Router>
            <div className="App">
                <Navigation user={user} onLogout={handleLogout} />
                <div className="container mt-4">
                    <Routes>
                        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : getDashboard()} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/request" element={user ? <RequestForm user={user} /> : <Navigate to="/login" />} />
                        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                        <Route path="/hc-dashboard" element={user && (user.role === 'hc' || user.department === 'Human Capital') ? <HCDashboard user={user} /> : <Navigate to="/login" />} />
                        <Route path="/admin-dashboard" element={user && user.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} />
                        <Route path="/driver-dashboard" element={user && user.role === 'driver' ? <DriverDashboard user={user} /> : <Navigate to="/login" />} />

                        <Route path="/" element={<Navigate to={user ? ((user.role === 'hc' || user.department === 'Human Capital') ? "/hc-dashboard" : (user.role === 'driver' ? "/driver-dashboard" : "/dashboard")) : "/login"} />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
