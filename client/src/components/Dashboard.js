import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Form, Modal, Card } from 'react-bootstrap';
import axios from 'axios';

const Dashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [action, setAction] = useState(''); // 'approve' or 'reject'
    const [comment, setComment] = useState('');
    const [viewModal, setViewModal] = useState(false);
    const [requestDetails, setRequestDetails] = useState(null);

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

    const handleAction = (request, act) => {
        setCurrentRequest(request);
        setAction(act);
        setComment('');
        setShowModal(true);
    };

    const handleView = async (request) => {
        try {
            const config = {
                headers: { 'x-auth-token': user.token }
            };
            // Fetch logs for this request
            const logsRes = await axios.get(`http://localhost:5000/api/cars/${request.id}/logs`, config);
            const requestWithLogs = { ...request, logs: logsRes.data };

            setRequestDetails(requestWithLogs);
            setViewModal(true);
        } catch (error) {
            console.error('Error fetching logs:', error);
            // Fallback to show details without logs if fetch fails
            setRequestDetails(request);
            setViewModal(true);
        }
    };

    const submitAction = async () => {
        try {
            const config = {
                headers: {
                    'x-auth-token': user.token
                }
            };

            let status = 'rejected';
            if (action === 'approve') {
                if (user.role === 'hc') {
                    status = 'approved_by_hc';
                } else if (user.manager_level === 'sub_department') {
                    status = 'approved_by_line_manager';
                } else if (user.manager_level === 'department') {
                    status = 'approved_by_dept_head';
                } else if (user.manager_level === 'operation') {
                    status = 'approved_by_ops_manager';
                } else if (user.manager_level === 'md') {
                    status = 'approved_by_md';
                }
            }

            await axios.put(`http://localhost:5000/api/cars/${currentRequest.id}`, { status, comment }, config);
            setShowModal(false);
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved_by_hc': return <Badge bg="success">Final Approved (HC)</Badge>;
            case 'approved_by_md': return <Badge bg="primary">Managing Director Approved</Badge>;
            case 'approved_by_ops_manager': return <Badge bg="info">Operation Manager Approved</Badge>;
            case 'approved_by_dept_head': return <Badge bg="primary">Head of Department Approved</Badge>;
            case 'approved_by_line_manager': return <Badge bg="secondary">Line Manager Approved</Badge>;
            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
            default: return <Badge bg="warning">Pending</Badge>;
        }
    };

    return (
        <div className="pb-5">
            <h2 className="mb-2">Dashboard</h2>
            {user.manager_level === 'sub_department' && (
                <p className="text-muted small mb-4">
                    <i className="bi bi-info-circle"></i> Viewing requests from your channel as Line Manager
                </p>
            )}
            {user.manager_level === 'department' && (
                <p className="text-muted small mb-4">
                    <i className="bi bi-info-circle"></i> Viewing requests from your department as Head of Department
                </p>
            )}
            {user.manager_level === 'operation' && (
                <p className="text-muted small mb-4">
                    <i className="bi bi-info-circle"></i> Viewing requests pending Operation Manager approval
                </p>
            )}
            {user.manager_level === 'md' && (
                <p className="text-muted small mb-4">
                    <i className="bi bi-info-circle"></i> Viewing requests pending Managing Director approval
                </p>
            )}
            {user.manager_level === 'board' && (
                <p className="text-muted small mb-4">
                    <i className="bi bi-info-circle"></i> Tracking your requests as a Board Member
                </p>
            )}
            <Card className="shadow-sm border-0">
                <Card.Body>
                    <Table striped hover responsive className="bg-white">
                        <thead style={{ backgroundColor: '#009639', color: 'white' }}>
                            <tr>
                                <th>Details</th>
                                <th>Trip Schedule</th>
                                <th>Status</th>

                                {(user.role === 'manager' || user.role === 'hc' || (user.manager_level && user.manager_level !== 'none')) && <th>User / Dept</th>}
                                <th>Assigned To</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-3">No requests found.</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            {user.role === 'hc' && (
                                                <><strong>{req.car_model}</strong><br /></>
                                            )}
                                            <small className="text-muted">{req.purpose}</small>
                                        </td>
                                        <td>
                                            {new Date(req.date_out).toLocaleDateString()} to {new Date(req.date_back).toLocaleDateString()}
                                        </td>
                                        <td>{getStatusBadge(req.status)}</td>
                                        {(user.role === 'manager' || user.role === 'hc' || (user.manager_level && user.manager_level !== 'none')) && (
                                            <td>
                                                {req.full_name}<br />
                                                <small className="text-muted">{req.department}</small>
                                            </td>
                                        )}
                                        <td>{req.assigned_to_name || <small className="text-muted">N/A</small>}</td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                {(user.role === 'manager' || (user.manager_level && user.manager_level !== 'none')) ? (
                                                    <>
                                                        {((user.manager_level === 'sub_department' && req.status === 'pending') ||
                                                            (user.manager_level === 'department' && req.status === 'approved_by_line_manager' && req.requester_manager_level !== 'none') ||
                                                            (user.manager_level === 'md' && req.status === 'pending' && req.requester_manager_level === 'board')) ? (
                                                            <>
                                                                <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(req, 'approve')}>Approve</Button>
                                                                <Button size="sm" variant="outline-danger" className="me-2" onClick={() => handleAction(req, 'reject')}>Reject</Button>
                                                            </>
                                                        ) : (user.manager_level === 'department' && req.status === 'pending' && req.requester_manager_level !== 'none') ? (
                                                            <span className="small text-info me-2">
                                                                <i className="bi bi-clock"></i> Pending Manager of Others
                                                            </span>
                                                        ) : (user.manager_level === 'operation' && req.status === 'approved_by_dept_head') ? (
                                                            <>
                                                                <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(req, 'approve')}>Approve</Button>
                                                                <Button size="sm" variant="outline-danger" className="me-2" onClick={() => handleAction(req, 'reject')}>Reject</Button>
                                                            </>
                                                        ) : (
                                                            <span className="small text-muted text-capitalize me-2">
                                                                {req.status.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                        <Button size="sm" variant="outline-primary" onClick={() => handleView(req)} title="View Details">
                                                            👁️
                                                        </Button>
                                                    </>
                                                ) : user.role === 'employee' ? (
                                                    <Button size="sm" variant="outline-primary" onClick={() => handleView(req)} title="Track Request">
                                                        👁️
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{action === 'approve' ? 'Approve' : 'Reject'} Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>{(user.role === 'manager' || (user.manager_level && user.manager_level !== 'none')) ? 'Manager Comment' : 'Comment'}</Form.Label>
                        <Form.Control as="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant={action === 'approve' ? 'success' : 'danger'} onClick={submitAction}>Confirm</Button>
                </Modal.Footer>
            </Modal>


            {/* View Details Modal for Employee */}
            <Modal show={viewModal} onHide={() => setViewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Request Tracking</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {requestDetails && (
                        <div>
                            {/* Progress Stepper - Dynamic Path based on user type */}
                            <div className="mb-4 position-relative">
                                <div className="d-flex justify-content-between mb-2">
                                    <div className="text-center" style={{ width: requestDetails.requester_manager_level === 'board' ? '33%' : '33%' }}>
                                        <Badge bg="success" className="rounded-circle p-2 mb-1">1</Badge>
                                        <br />
                                        <small className="fw-bold">Submitted</small>
                                    </div>
                                    <div className="text-center" style={{ width: requestDetails.requester_manager_level === 'board' ? '33%' : '33%' }}>
                                        <Badge bg={
                                            ['approved_by_line_manager', 'approved_by_dept_head', 'approved_by_ops_manager', 'approved_by_md', 'approved_by_hc'].includes(requestDetails.status) ? 'success' :
                                                (requestDetails.status === 'rejected' ? 'danger' : 'secondary')
                                        } className="rounded-circle p-2 mb-1">2</Badge>
                                        <br />
                                        <small className="fw-bold">
                                            {requestDetails.requester_manager_level === 'board' ? 'MD Approval' : 'Line Manager'}
                                        </small>
                                    </div>
                                    <div className="text-center" style={{ width: requestDetails.requester_manager_level === 'board' ? '33%' : '33%' }}>
                                        <Badge bg={
                                            ['approved_by_hc'].includes(requestDetails.status) ? 'success' : 'secondary'
                                        } className="rounded-circle p-2 mb-1">3</Badge>
                                        <br />
                                        <small className="fw-bold">HC Final</small>
                                    </div>
                                </div>
                                <div className="progress" style={{ height: '5px' }}>
                                    <div className={`progress-bar bg-${requestDetails.status === 'rejected' ? 'danger' : 'success'}`} role="progressbar" style={{
                                        width: requestDetails.requester_manager_level === 'board' ? (
                                            requestDetails.status === 'approved_by_hc' ? '100%' :
                                                requestDetails.status === 'approved_by_md' ? '66%' :
                                                    requestDetails.status === 'rejected' ? '100%' : '33%'
                                        ) : (
                                            requestDetails.status === 'approved_by_hc' ? '100%' :
                                                requestDetails.status === 'approved_by_line_manager' ? '66%' :
                                                    requestDetails.status === 'rejected' ? '100%' : '33%'
                                        )
                                    }}></div>
                                </div>
                            </div>

                            <Card className="bg-light border-0 mb-3">
                                <Card.Body>
                                    <h6>Trip Details</h6>
                                    <p className="mb-1"><strong>Car Model:</strong> {requestDetails.car_model}</p>
                                    <p className="mb-1"><strong>Purpose:</strong> {requestDetails.purpose}</p>
                                    <p className="mb-0"><strong>Dates:</strong> {new Date(requestDetails.date_out).toLocaleDateString()} - {new Date(requestDetails.date_back).toLocaleDateString()}</p>
                                </Card.Body>
                            </Card>

                            <h6 className="mt-3">Approval Details</h6>
                            <Table size="sm" bordered>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '30%' }}><strong>Current Status</strong></td>
                                        <td>{getStatusBadge(requestDetails.status)}</td>
                                    </tr>
                                    {requestDetails.manager_comment && (
                                        <tr>
                                            <td><strong>Manager Comment</strong></td>
                                            <td>{requestDetails.manager_comment}</td>
                                        </tr>
                                    )}
                                    {requestDetails.hr_comment && (
                                        <tr>
                                            <td><strong>HC Comment</strong></td>
                                            <td>{requestDetails.hr_comment}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>

                            {requestDetails.status === 'approved_by_hc' && (
                                <>
                                    <h6 className="mt-3 text-success">Vehicle Allocation</h6>
                                    <Card border="success">
                                        <Card.Body>
                                            <div className="row">
                                                <div className="col-md-4">
                                                    <strong>Vehicle:</strong><br /> {requestDetails.vehicle_allocated}
                                                </div>
                                                <div className="col-md-4">
                                                    <strong>Reg No:</strong><br /> {requestDetails.reg_no}
                                                </div>
                                                <div className="col-md-4">
                                                    <strong>Driver:</strong><br /> {requestDetails.driver_allocated}
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </>
                            )}

                            {/* Approval History Timeline */}
                            <h6 className="mt-4 mb-3">Approval Timeline</h6>
                            <div className="timeline">
                                {requestDetails.logs && requestDetails.logs.length > 0 ? (
                                    requestDetails.logs.map((log, index) => (
                                        <div key={log.id} className="d-flex mb-3">
                                            <div className="me-3">
                                                <Badge bg={log.action === 'REJECTED' ? 'danger' : 'success'} className="rounded-circle p-2">
                                                    {index + 1}
                                                </Badge>
                                                {index < requestDetails.logs.length - 1 && (
                                                    <div style={{ width: '2px', height: '100%', backgroundColor: '#dee2e6', margin: '0 auto' }}></div>
                                                )}
                                            </div>
                                            <div>
                                                <strong>{log.action}</strong>
                                                <div className="text-muted small">
                                                    By: {log.actor_name} <br />
                                                    {new Date(log.created_at).toLocaleString()}
                                                </div>
                                                {log.comment && (
                                                    <div className="mt-1 small fst-italic text-secondary">
                                                        "{log.comment}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted small">No history available.</p>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setViewModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Dashboard;
