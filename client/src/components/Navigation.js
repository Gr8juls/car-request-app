import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const Navigation = ({ user, onLogout }) => {
    const navigate = useNavigate();

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
                    <Nav className="ms-auto">
                        {!user ? (
                            <Nav.Link as={Link} to="/login">Login</Nav.Link>
                        ) : (
                            <>
                                <Nav.Link as={Link} to={user.role === 'hc' || user.department === 'Human Capital' ? "/hc-dashboard" : "/dashboard"}>
                                    {user.role === 'hc' || user.department === 'Human Capital' ? "HC Dashboard" : "Dashboard"}
                                </Nav.Link>
                                <Nav.Link as={Link} to="/request">New Request</Nav.Link>
                                <Button variant="outline-light" onClick={handleLogout} className="ms-2">Logout</Button>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Navigation;
