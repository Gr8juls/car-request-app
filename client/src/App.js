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
import Profile from './components/Profile';


// DriverDashboard deactivated
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';


function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedId = localStorage.getItem('id');
        const parsed_id = (storedId === 'null' || storedId === 'undefined' || !storedId) ? null : storedId;
        const role = localStorage.getItem('role');
        const department = localStorage.getItem('department');
        const manager_level = localStorage.getItem('manager_level');
        const line_manager_id = localStorage.getItem('line_manager_id');
        const parsed_lm_id = (line_manager_id === 'null' || line_manager_id === 'undefined') ? null : line_manager_id;

        if (token) {
            // Initial state from local storage
            setUser({ token, id: parsed_id, role, department, manager_level, line_manager_id: parsed_lm_id });

            // Re-hydrate full state from server to ensure ID and roles are correct
            axios.get('/api/auth/me', {
                headers: { 'x-auth-token': token }
            }).then(res => {
                const { id, role, department, manager_level, line_manager_id } = res.data;
                localStorage.setItem('id', id);
                localStorage.setItem('role', role);
                localStorage.setItem('department', department);
                localStorage.setItem('manager_level', manager_level);
                localStorage.setItem('line_manager_id', line_manager_id);
                setUser({ token, id, role, department, manager_level, line_manager_id });
            }).catch(err => {
                console.error('Session re-hydration failed', err);
            });
        }
    }, []);

    // Inactivity Timer (10 minutes)
    useEffect(() => {
        if (!user) return;

        let timer;
        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                console.log('User inactive for 10 minutes. Logging out...');
                handleLogout();
            }, 600000); // 10 minutes in milliseconds
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        resetTimer(); // Initialize timer

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [user]);

    // Add axios interceptor to handle 401 errors globally
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    // Token is invalid or expired, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('id');
                    localStorage.removeItem('role');
                    localStorage.removeItem('department');
                    localStorage.removeItem('manager_level');
                    localStorage.removeItem('line_manager_id');
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

    const handleLogin = (token, id, role, department, manager_level, line_manager_id) => {
        localStorage.setItem('token', token);
        localStorage.setItem('id', id);
        localStorage.setItem('role', role);
        localStorage.setItem('department', department);
        localStorage.setItem('manager_level', manager_level);
        localStorage.setItem('line_manager_id', line_manager_id);
        setUser({ token, id, role, department, manager_level, line_manager_id });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('id');
        localStorage.removeItem('role');
        localStorage.removeItem('department');
        localStorage.removeItem('manager_level');
        localStorage.removeItem('line_manager_id');
        setUser(null);
    };

    const getDashboard = () => {
        if (!user) return <Navigate to="/login" />;
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;
        // Driver dashboard deactivated — drivers fall through to the standard Dashboard
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
                        <Route path="/register" element={user && user.role === 'admin' ? <Register /> : <Navigate to="/dashboard" />} />
                        <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
                        <Route path="/request" element={user ? <RequestForm user={user} /> : <Navigate to="/login" />} />
                        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                        <Route path="/hc-dashboard" element={user && (user.role === 'hc' || user.department === 'Human Capital') ? <HCDashboard user={user} /> : <Navigate to="/login" />} />
                        <Route path="/admin-dashboard" element={user && user.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} />
                        {/* /driver-dashboard route deactivated */}
                        <Route path="/forgot-password" element={<ForgotPassword />} />


                        <Route path="/" element={<Navigate to={user ? ((user.role === 'hc' || user.department === 'Human Capital') ? "/hc-dashboard" : "/dashboard") : "/login"} />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;

