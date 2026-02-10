import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Card } from 'react-bootstrap';
import axios from 'axios';

const DriverDashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);

    const fetchRequests = async () => {
        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            const res = await axios.get('http://localhost:5000/api/cars', config);
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleComplete = async (requestId) => {
        if (!window.confirm('Are you sure you want to mark this trip as finished?')) return;
        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            await axios.put(`http://localhost:5000/api/cars/${requestId}/complete`, {}, config);
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 30000); // Poll for new assignments
        return () => clearInterval(interval);
    }, [user.token]);

    return (
        <div className="pb-5">
            <h2 className="mb-4" style={{ color: '#009639' }}>Driver Dashboard</h2>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-primary text-white py-3">
                    <h5 className="mb-0">My Assigned Trips</h5>
                </Card.Header>
                <Card.Body>
                    <Table striped hover responsive className="bg-white">
                        <thead style={{ backgroundColor: '#009639', color: 'white' }}>
                            <tr>
                                <th>Schedule</th>
                                <th>Requester</th>
                                <th>Trip Details</th>
                                <th>ETA</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4">No trips assigned yet.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            {new Date(req.date_out).toLocaleDateString()} <br />
                                            <small className="fw-bold">{req.time_out}</small>
                                        </td>
                                        <td>
                                            <strong>{req.full_name}</strong><br />
                                            <small className="text-muted">{req.department}</small>
                                        </td>
                                        <td>
                                            <strong>{req.location}</strong><br />
                                            <small className="text-muted">{req.purpose}</small>
                                        </td>
                                        <td>
                                            <span className="text-primary fw-bold">{req.time_back}</span><br />
                                            <small className="text-muted">{new Date(req.date_back).toLocaleDateString()}</small>
                                        </td>
                                        <td>
                                            {req.vehicle_allocated}<br />
                                            <small className="text-muted text-uppercase">{req.reg_no}</small>
                                        </td>
                                        <td>
                                            <Badge bg={req.status === 'completed' ? 'secondary' : 'success'}>
                                                {req.status === 'completed' ? 'Completed' : 'Assigned/Active'}
                                            </Badge>
                                        </td>
                                        <td>
                                            {req.status === 'approved_by_hc' && (
                                                <Button size="sm" variant="success" onClick={() => handleComplete(req.id)}>
                                                    Finish Ride
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </div>
    );
};

export default DriverDashboard;
