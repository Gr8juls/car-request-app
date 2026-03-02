import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Card, Modal, Form } from 'react-bootstrap';
import axios from 'axios';

const DriverDashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [completionData, setCompletionData] = useState({
        trip_confirmed: false
    });

    const fetchRequests = async () => {
        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            const res = await axios.get(`/api/cars`, config);
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleStart = async (req) => {
        if (!window.confirm(`Are you sure you want to start the trip to ${req.location}?`)) return;
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            await axios.put(`/api/cars/${req.id}/start`, {}, config);
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to start trip');
        }
    };

    const handleComplete = (req) => {
        setSelectedRequest(req);
        setShowModal(true);
    };

    const submitComplete = async () => {

        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };
            await axios.put(`/api/cars/${selectedRequest.id}/complete`, completionData, config);
            setShowModal(false);
            setCompletionData({
                trip_confirmed: false
            });
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
                                            {req.status === 'completed' ? (
                                                <Badge bg="secondary">Completed</Badge>
                                            ) : req.status === 'in_progress' ? (
                                                <Badge bg="warning">In Progress</Badge>
                                            ) : (
                                                <Badge bg="info">Assigned / Waiting</Badge>
                                            )}
                                        </td>
                                        <td>
                                            {req.status === 'approved_by_hc' && (
                                                <Button size="sm" variant="primary" onClick={() => handleStart(req)}>
                                                    Start Trip
                                                </Button>
                                            )}
                                            {req.status === 'in_progress' && (
                                                <Button size="sm" variant="success" onClick={() => handleComplete(req)}>
                                                    Complete Trip
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

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>Complete Trip Confirmation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRequest && (
                        <div className="mb-4 p-3 bg-light rounded border">
                            <h6 className="text-muted text-uppercase small fw-bold mb-2">Trip Summary</h6>
                            <div className="row g-2">
                                <div className="col-6">
                                    <small className="text-muted d-block">Requester</small>
                                    <strong>{selectedRequest.full_name}</strong>
                                </div>
                                <div className="col-6">
                                    <small className="text-muted d-block">Destination</small>
                                    <strong>{selectedRequest.location}</strong>
                                </div>
                                <div className="col-12 mt-2">
                                    <small className="text-muted d-block">Purpose</small>
                                    <strong>{selectedRequest.purpose}</strong>
                                </div>
                                <div className="col-12 mt-2">
                                    <small className="text-muted d-block">Scheduled Time</small>
                                    <strong>{selectedRequest.time_out} - {selectedRequest.time_back}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                    <Form>

                        <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded">
                            <Form.Check
                                type="checkbox"
                                id="trip-confirmation"
                                label="I confirm that I went to the requested destination and returned as scheduled."
                                className="fw-bold"
                                checked={completionData.trip_confirmed}
                                onChange={(e) => setCompletionData({ ...completionData, trip_confirmed: e.target.checked })}
                            />
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button
                        variant="success"
                        onClick={submitComplete}
                        disabled={!completionData.trip_confirmed}
                    >
                        Confirm & Complete Trip
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default DriverDashboard;

