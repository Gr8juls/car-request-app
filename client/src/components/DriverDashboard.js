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

    useEffect(() => {
        fetchRequests();
    }, [user.token]);

    return (
        <div className="pb-5">
            <h2 className="mb-4">Driver Dashboard</h2>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">My Assigned Trips</h5>
                </Card.Header>
                <Card.Body>
                    <Table striped hover responsive className="bg-white">
                        <thead>
                            <tr>
                                <th>Departure Date</th>
                                <th>Requester</th>
                                <th>Trip Details</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-3">No trips assigned yet.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            {new Date(req.date_out).toLocaleDateString()} <br />
                                            <small>{req.time_out}</small>
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
                                            {req.vehicle_allocated}<br />
                                            <small className="text-muted">{req.reg_no}</small>
                                        </td>
                                        <td>
                                            <Badge bg="success">Assigned</Badge>
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
