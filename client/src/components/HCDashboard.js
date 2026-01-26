import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Form, Modal, Tabs, Tab, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const HCDashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [action, setAction] = useState(''); // 'approve' or 'reject'
    const [comment, setComment] = useState('');
    const [allocation, setAllocation] = useState({
        driver_allocated: '',
        vehicle_allocated: '',
        reg_no: ''
    });

    // Filters for Report
    const [filters, setFilters] = useState({
        status: '',
        department: '',
        startDate: '',
        endDate: '',
        sortBy: 'created_at',
        order: 'DESC'
    });

    const fetchRequests = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const res = await axios.get('http://localhost:5000/api/cars', config);
            // Filter requests pending HC action (approved by Dept Head) OR still in early stages
            setRequests(res.data.filter(r => ['pending', 'approved_by_line_manager', 'approved_by_dept_head'].includes(r.status)));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchReport = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const queryParams = new URLSearchParams(filters).toString();
            const res = await axios.get(`http://localhost:5000/api/cars?${queryParams}`, config);
            setReportData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = () => {
        if (reportData.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = ["Request ID", "Date Submitted", "User", "Department", "Trip Date", "Time Out", "Return Date", "Time Back", "Car Model", "Purpose", "Status", "Allocated Vehicle", "Reg No", "Driver"];

        const csvContent = [
            headers.join(","),
            ...reportData.map(req => {
                return [
                    req.id,
                    new Date(req.created_at).toLocaleDateString(),
                    `"${req.full_name}"`,
                    `"${req.department}"`,
                    new Date(req.date_out).toLocaleDateString(),
                    req.time_out,
                    new Date(req.date_back).toLocaleDateString(),
                    req.time_back,
                    `"${req.car_model}"`,
                    `"${req.purpose}"`,
                    req.status,
                    `"${req.vehicle_allocated || ''}"`,
                    `"${req.reg_no || ''}"`,
                    `"${req.driver_allocated || ''}"`
                ].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `car_requests_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchRequests();
        fetchReport();
    }, [user.token, filters]);

    const handleAction = (request, act) => {
        setCurrentRequest(request);
        setAction(act);
        setComment('');
        setAllocation({
            driver_allocated: request.driver_allocated || '',
            vehicle_allocated: request.vehicle_allocated || '',
            reg_no: request.reg_no || ''
        });
        setShowModal(true);
    };

    const submitAction = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            let status = action === 'approve' ? 'approved_by_hc' : 'rejected';

            await axios.put(`http://localhost:5000/api/cars/${currentRequest.id}`, {
                status,
                comment,
                ...allocation
            }, config);
            setShowModal(false);
            fetchRequests();
            fetchReport();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved_by_hc': return <Badge bg="success">HC Approved & Allocated</Badge>;
            case 'approved_by_dept_head': return <Badge bg="info">Dept. Head Approved</Badge>;
            case 'approved_by_line_manager': return <Badge bg="primary">Line Manager Approved</Badge>;
            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
            default: return <Badge bg="warning">Pending Manager Approval</Badge>;
        }
    };

    return (
        <div className="pb-5">
            <h2 className="mb-4" style={{ color: '#009639' }}>HC Dashboard</h2>

            <Tabs defaultActiveKey="active" className="mb-4 custom-tabs">
                <Tab eventKey="active" title="Pending My Approval">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <Table striped hover responsive className="bg-white">
                                <thead style={{ backgroundColor: '#009639', color: 'white' }}>
                                    <tr>
                                        <th>Details</th>
                                        <th>Trip Schedule</th>
                                        <th>User / Dept</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center py-4">No requests pending HC approval.</td></tr>
                                    ) : (
                                        requests.map(req => (
                                            <tr key={req.id}>
                                                <td>
                                                    <strong>{req.car_model}</strong><br />
                                                    <small className="text-muted">{req.purpose}</small>
                                                </td>
                                                <td>
                                                    {new Date(req.date_out).toLocaleDateString()} {req.time_out}<br />
                                                    <span className="text-muted">to</span><br />
                                                    {new Date(req.date_back).toLocaleDateString()} {req.time_back}
                                                </td>
                                                <td>
                                                    {req.full_name}<br />
                                                    <small className="text-muted">{req.department}</small>
                                                </td>
                                                <td>{getStatusBadge(req.status)}</td>
                                                <td>
                                                    {req.status === 'rejected' ? (
                                                        <Badge bg="danger">Rejected</Badge>
                                                    ) : (
                                                        // HC can approve after LM for Employees, or after DH for Managers
                                                        ((req.requester_manager_level === 'none' && req.status === 'approved_by_line_manager') ||
                                                            (req.requester_manager_level !== 'none' && req.status === 'approved_by_dept_head')) ? (
                                                            <Button size="sm" variant="success" onClick={() => handleAction(req, 'approve')}>Process Allocation</Button>
                                                        ) : (
                                                            <span className="small text-muted text-capitalize">
                                                                {req.status === 'pending' ? 'Pending Line Manager' :
                                                                    req.status === 'approved_by_line_manager' ? 'Pending Dept Head' :
                                                                        req.status.replace(/_/g, ' ')}
                                                            </span>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="report" title="Reports & History">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Request History</h5>
                                <Button variant="outline-success" onClick={handleExport}>
                                    <span className="me-2">⬇</span>Export to CSV
                                </Button>
                            </div>
                            <div className="bg-light p-3 rounded mb-4">
                                <Row className="g-3">
                                    <Col md={2}>
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                                            <option value="">All Statuses</option>
                                            <option value="pending">Pending Line Manager</option>
                                            <option value="approved_by_line_manager">Pending Dept Head</option>
                                            <option value="approved_by_dept_head">Pending HC</option>
                                            <option value="approved_by_hc">HC Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Label>Department</Form.Label>
                                        <Form.Control type="text" placeholder="Filter dept..." value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} />
                                    </Col>
                                    <Col md={2}>
                                        <Form.Label>From Date</Form.Label>
                                        <Form.Control type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                                    </Col>
                                    <Col md={2}>
                                        <Form.Label>To Date</Form.Label>
                                        <Form.Control type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                                    </Col>
                                    <Col md={2}>
                                        <Form.Label>Sort By</Form.Label>
                                        <Form.Select value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}>
                                            <option value="created_at">Submission Date</option>
                                            <option value="date_out">Trip Date</option>
                                            <option value="car_model">Car Model</option>
                                            <option value="status">Status</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Label>Order</Form.Label>
                                        <Form.Select value={filters.order} onChange={e => setFilters({ ...filters, order: e.target.value })}>
                                            <option value="DESC">Descending</option>
                                            <option value="ASC">Ascending</option>
                                        </Form.Select>
                                    </Col>
                                </Row>
                            </div>

                            <Table striped hover responsive>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>User / Dept</th>
                                        <th>Vehicle Model</th>
                                        <th>Allocation Details</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map(req => (
                                        <tr key={req.id}>
                                            <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                            <td>{req.full_name}<br /><small>{req.department}</small></td>
                                            <td>{req.car_model}</td>
                                            <td>
                                                {req.vehicle_allocated ? (
                                                    <div className="small">
                                                        <strong>{req.vehicle_allocated}</strong><br />
                                                        Reg: {req.reg_no}<br />
                                                        Driver: {req.driver_allocated}
                                                    </div>
                                                ) : <span className="text-muted">N/A</span>}
                                            </td>
                                            <td>{getStatusBadge(req.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{action === 'approve' ? 'Approve & Allocate Vehicle' : 'Reject Request'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {action === 'approve' ? (
                        <>
                            <h6 className="mb-3">Allocation Details</h6>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Label>Driver Allocated</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={allocation.driver_allocated}
                                        onChange={(e) => setAllocation({ ...allocation, driver_allocated: e.target.value })}
                                        placeholder="Enter driver name"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Vehicle Allocated</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={allocation.vehicle_allocated}
                                        onChange={(e) => setAllocation({ ...allocation, vehicle_allocated: e.target.value })}
                                        placeholder="Enter vehicle model"
                                    />
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Label>Registration No.</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={allocation.reg_no}
                                        onChange={(e) => setAllocation({ ...allocation, reg_no: e.target.value })}
                                        placeholder="e.g. RAC 123 A"
                                    />
                                </Col>
                            </Row>
                        </>
                    ) : null}
                    <Form.Group>
                        <Form.Label>HC Comments / Instructions</Form.Label>
                        <Form.Control as="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant={action === 'approve' ? 'success' : 'danger'} onClick={submitAction}>
                        {action === 'approve' ? 'Approve & Save' : 'Confirm Rejection'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default HCDashboard;
