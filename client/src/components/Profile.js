import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const Profile = ({ user, setUser }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        department: '',
        job_title: '',
        manager_level: '',
        line_manager_name: '',
        currentPassword: '',
        newPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const config = { headers: { 'x-auth-token': user.token } };
                const res = await axios.get(`/api/auth/me`, config);
                const data = res.data;
                setFormData({
                    full_name: data.full_name || '',
                    email: data.email || '',
                    department: data.department || '',
                    job_title: data.job_title || '',
                    manager_level: data.manager_level || '',
                    line_manager_name: data.line_manager_name || '',
                    currentPassword: '',
                    newPassword: ''
                });
            } catch (err) {
                console.error(err);
                setError('Failed to load profile');
            }
        };
        fetchProfile();
    }, [user.token]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const payload = { ...formData };
            if (!payload.newPassword) {
                delete payload.currentPassword;
                delete payload.newPassword;
            }
            const res = await axios.put(`/api/auth/profile`, payload, config);
            setMessage(res.data.message || 'Profile updated successfully!');
            // Clear passwords after success
            setFormData({ ...formData, currentPassword: '', newPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Profile update failed');
        }
    };

    return (
        <div className="container mt-5 pb-5 d-flex justify-content-center">
            <Card style={{ width: '600px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: '15px' }}>
                <div style={{ backgroundColor: '#009639', height: '8px', borderRadius: '15px 15px 0 0' }}></div>
                <Card.Body className="p-5">
                    <h2 className="mb-4 text-center" style={{ color: '#009639', fontWeight: 'bold' }}>My Profile</h2>

                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <h6 className="text-muted text-uppercase mb-3 border-bottom pb-2">Personal Details</h6>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </Form.Group>

                        <h6 className="text-muted text-uppercase mb-3 mt-4 border-bottom pb-2">Organizational Details</h6>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Label>Department</Form.Label>
                                <Form.Control type="text" value={formData.department} disabled readOnly className="bg-light" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Label>Job Title</Form.Label>
                                <Form.Control type="text" value={formData.job_title} disabled readOnly className="bg-light" />
                            </div>
                        </div>
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <Form.Label>Role / Level</Form.Label>
                                <Form.Control type="text" value={formData.manager_level === 'none' ? 'Employee' : formData.manager_level} disabled readOnly className="text-capitalize bg-light" />
                            </div>
                            <div className="col-md-6">
                                <Form.Label>Line Manager</Form.Label>
                                <Form.Control type="text" value={formData.line_manager_name || 'None Assigned'} disabled readOnly className="bg-light" />
                            </div>
                        </div>

                        <h6 className="text-muted text-uppercase mb-3 mt-4 border-bottom pb-2">Change Password</h6>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Required if changing password"
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Enter new password"
                            />
                        </Form.Group>

                        <div className="d-grid mt-5">
                            <Button variant="success" type="submit" size="lg" style={{ backgroundColor: '#009639', border: 'none' }}>
                                Save Profile Changes
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Profile;
