import React, { useState } from 'react';
import { Form, Button, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const RequestForm = ({ user }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        department: '',
        location: '',
        purpose: '',
        car_model: 'Not Specified',
        reason: '',
        date_out: '',
        time_out: '',
        date_back: '',
        time_back: '',
        assigned_to: ''
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

        if (new Date(date_back) < new Date(date_out)) {
            setError('Return date cannot be earlier than departure date.');
            return;
        }

        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            // Note: assigned_to is omitted to let backend use Admin assignment
            const { assigned_to, ...submissionData } = { ...formData, car_model: formData.car_model || 'Not Specified' };
            await axios.post('/api/cars', submissionData, config);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Request failed');
        }
    };

    return (
        <div className="d-flex justify-content-center pb-5 mt-4">
            <Card style={{ width: '800px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: '15px' }}>
                <div style={{ backgroundColor: '#009639', height: '12px', borderRadius: '15px 15px 0 0' }}></div>
                <Card.Body className="p-5">
                    <div className="text-center mb-5">
                        <h2 style={{ color: '#009639', fontWeight: '800', fontSize: '2.2rem', marginBottom: '5px' }}>Vehicle Requisition</h2>
                        <div className="d-flex justify-content-center align-items-center">
                            <span className="text-muted" style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.8rem' }}>Official Digital Form</span>
                        </div>
                    </div>

                    {error && <Alert variant="danger" className="mb-4 shadow-sm">{error}</Alert>}

                    <Form onSubmit={onSubmit}>
                        {/* Section: User Information */}
                        <div className="mb-5 p-4 border rounded-3 bg-light bg-opacity-10" style={{ borderStyle: 'dashed !important' }}>
                            <h5 className="mb-4 text-center text-muted" style={{ fontWeight: '600', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                <span className="p-2 px-3 bg-white shadow-sm rounded-pill">👤 User Details</span>
                            </h5>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <Form.Group>
                                        <Form.Label style={{ fontWeight: '500' }}>Department</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="department"
                                            value={formData.department}
                                            onChange={onChange}
                                            required
                                            placeholder="Enter department"
                                            className="py-2 border-0 shadow-sm"
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <Form.Group>
                                        <Form.Label style={{ fontWeight: '500' }}>Location</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={onChange}
                                            required
                                            placeholder="Enter destination"
                                            className="py-2 border-0 shadow-sm"
                                        />
                                    </Form.Group>
                                </div>
                            </div>

                        </div>

                        {/* Section: Trip Logistics */}
                        <div className="mb-5 p-4 border rounded-3">
                            <h5 className="mb-4 text-center text-muted" style={{ fontWeight: '600', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                <span className="p-2 px-3 bg-white shadow-sm rounded-pill">🚗 Trip Logistics</span>
                            </h5>

                            <Form.Group className="mb-4">
                                <Form.Label style={{ fontWeight: '500' }}>Purpose of Trip</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    name="purpose"
                                    value={purpose}
                                    onChange={onChange}
                                    required
                                    placeholder="Briefly describe the business need for this trip"
                                    className="border-0 shadow-sm"
                                />
                            </Form.Group>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <Form.Label style={{ fontWeight: '500' }}>Departure</Form.Label>
                                    <div className="input-group mb-3 shadow-sm rounded">
                                        <Form.Control type="date" name="date_out" value={date_out} onChange={onChange} required className="border-0" />
                                        <Form.Control type="time" name="time_out" value={time_out} onChange={onChange} className="border-0 border-start" />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <Form.Label style={{ fontWeight: '500' }}>Expected Return</Form.Label>
                                    <div className="input-group mb-3 shadow-sm rounded">
                                        <Form.Control type="date" name="date_back" value={date_back} onChange={onChange} min={date_out} required className="border-0" />
                                        <Form.Control type="time" name="time_back" value={time_back} onChange={onChange} className="border-0 border-start" />
                                    </div>
                                </div>
                            </div>

                            <Form.Group className="mt-3">
                                <Form.Label style={{ fontWeight: '500' }}>Additional Comments / Requirements</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    name="reason"
                                    value={reason}
                                    onChange={onChange}
                                    placeholder="Specify if a driver is needed, or any other details"
                                    className="border-0 shadow-sm"
                                />
                            </Form.Group>
                        </div>

                        <div className="text-center mt-5">
                            <Button
                                variant="success"
                                type="submit"
                                className="px-5 py-3 shadow"
                                style={{
                                    backgroundColor: '#009639',
                                    border: 'none',
                                    borderRadius: '50px',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem',
                                    transition: 'all 0.3s'
                                }}
                            >
                                🚀 Send Requisition
                            </Button>
                            <div className="mt-3">
                                <small className="text-muted">By clicking submit, your request will be routed to the selected manager.</small>
                            </div>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};
export default RequestForm;

