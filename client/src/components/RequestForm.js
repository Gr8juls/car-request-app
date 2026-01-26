import React, { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RequestForm = ({ user }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        department: '',
        location: '',
        purpose: '',
        car_model: 'Not Specified', // Default value since field is hidden
        reason: '',
        date_out: '',
        time_out: '',
        date_back: '',
        time_back: ''
    });
    const [error, setError] = useState('');

    const {
        department, location, purpose, car_model, reason,
        date_out, time_out, date_back, time_back
    } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            await axios.post('http://localhost:5000/api/cars', { ...formData, car_model: formData.car_model || 'Not Specified' }, config);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Request failed');
        }
    };

    return (
        <div className="d-flex justify-content-center pb-5">
            <Card style={{ width: '800px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ backgroundColor: '#009639', height: '10px', borderRadius: '4px 4px 0 0' }}></div>
                <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="mb-0" style={{ color: '#009639', fontWeight: 'bold' }}>Vehicle Requisition</h2>
                        <span className="text-muted">Digital Form</span>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={onSubmit}>
                        <h5 className="mb-3 border-bottom pb-2">User Information</h5>
                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Department</Form.Label>
                                    <Form.Control type="text" name="department" value={department} onChange={onChange} required placeholder="Enter department" />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label>Location</Form.Label>
                                    <Form.Control type="text" name="location" value={location} onChange={onChange} required placeholder="Enter location" />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Purpose of Trip</Form.Label>
                            <Form.Control as="textarea" rows={2} name="purpose" value={purpose} onChange={onChange} required placeholder="Describe the purpose of your trip" />
                        </Form.Group>

                        <h5 className="mb-3 border-bottom pb-2 mt-4">Trip Duration</h5>
                        <div className="row">
                            <div className="col-md-3">
                                <Form.Group className="mb-3">
                                    <Form.Label>Date Out</Form.Label>
                                    <Form.Control type="date" name="date_out" value={date_out} onChange={onChange} required />
                                </Form.Group>
                            </div>
                            <div className="col-md-3">
                                <Form.Group className="mb-3">
                                    <Form.Label>Time Out</Form.Label>
                                    <Form.Control type="time" name="time_out" value={time_out} onChange={onChange} />
                                </Form.Group>
                            </div>
                            <div className="col-md-3">
                                <Form.Group className="mb-3">
                                    <Form.Label>Date Back</Form.Label>
                                    <Form.Control type="date" name="date_back" value={date_back} onChange={onChange} required />
                                </Form.Group>
                            </div>
                            <div className="col-md-3">
                                <Form.Group className="mb-3">
                                    <Form.Label>Time Back</Form.Label>
                                    <Form.Control type="time" name="time_back" value={time_back} onChange={onChange} />
                                </Form.Group>
                            </div>
                        </div>



                        <Form.Group className="mb-4">
                            <Form.Label>Additional Comments</Form.Label>
                            <Form.Control as="textarea" rows={2} name="reason" value={reason} onChange={onChange} placeholder="Any other specific requirements?" />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100 py-2" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Submit Requisition
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default RequestForm;
