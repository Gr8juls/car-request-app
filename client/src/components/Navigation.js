import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, Nav, Container, Button, Badge, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navigation = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user || !user.token) return;
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const res = await axios.get('/api/notifications', config);
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleMarkAllRead = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            await axios.put('/api/notifications/mark-all/read', {}, config);
            fetchNotifications();
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <Navbar expand="lg" className="navbar">
            <Container>
                <Navbar.Brand as={Link} to="/" className="navbar-brand">
                    <span style={{ color: '#009639' }}>OLD</span>MUTUAL
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center">
                        {!user ? (
                            <Nav.Link as={Link} to="/login">Login</Nav.Link>
                        ) : (
                            <>
                                <Nav.Link as={Link} to={user.role === 'hc' || user.department === 'Human Capital' ? "/hc-dashboard" : "/dashboard"}>
                                    {user.role === 'hc' || user.department === 'Human Capital' ? "HC Dashboard" : "Dashboard"}
                                </Nav.Link>
                                <Nav.Link as={Link} to="/request">New Request</Nav.Link>

                                {/* Notification Bell */}
                                <Dropdown align="end" className="ms-3">
                                    <Dropdown.Toggle as="div" className="position-relative cursor-pointer notification-bell">
                                        <span style={{ fontSize: '1.2rem', color: 'white' }}>🔔</span>
                                        {unreadCount > 0 && (
                                            <Badge pill bg="danger" className="position-absolute translate-middle-y" style={{ fontSize: '0.6rem', top: '0', right: '-8px' }}>
                                                {unreadCount}
                                            </Badge>
                                        )}
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu className="shadow notification-menu" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                                        <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
                                            <h6 className="mb-0">Notifications</h6>
                                            {unreadCount > 0 && (
                                                <Button variant="link" size="sm" onClick={handleMarkAllRead} className="p-0 text-decoration-none">
                                                    Mark all as read
                                                </Button>
                                            )}
                                        </div>
                                        {notifications.length === 0 ? (
                                            <Dropdown.Item className="text-center text-muted py-3">No notifications</Dropdown.Item>
                                        ) : (
                                            notifications.map(n => (
                                                <Dropdown.Item key={n.id} className={`px-3 py-2 border-bottom ${!n.is_read ? 'bg-light fw-bold' : ''}`}>
                                                    <div className="small text-wrap">{n.message}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </div>
                                                </Dropdown.Item>
                                            ))
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>

                                <Nav.Link as={Link} to="/profile" className="ms-3">
                                    <span style={{ fontSize: '1.2rem' }}>👤</span> Profile
                                </Nav.Link>

                                <Button variant="outline-light" onClick={handleLogout} className="ms-3">Logout</Button>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Navigation;

