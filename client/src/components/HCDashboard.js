import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Form, Modal, Tabs, Tab, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const HCDashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [action, setAction] = useState(''); // 'approve' or 'reject'
    const [comment, setComment] = useState('');
    const [viewModal, setViewModal] = useState(false);
    const [requestDetails, setRequestDetails] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [allocation, setAllocation] = useState({
        driver_allocated: '',
        assigned_driver_id: '',
        vehicle_allocated: '',
        reg_no: ''
    });

    // CRUD State for Drivers & Vehicles
    const [showManageDriverModal, setShowManageDriverModal] = useState(false);
    const [showManageVehicleModal, setShowManageVehicleModal] = useState(false);
    const [manageDriverMode, setManageDriverMode] = useState('add');
    const [manageVehicleMode, setManageVehicleMode] = useState('add');
    const [driverFormData, setDriverFormData] = useState({ id: '', full_name: '', phone: '' });
    const [vehicleFormData, setVehicleFormData] = useState({ id: '', vehicle_name: '', reg_no: '' });

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
            const res = await axios.get('/api/cars', config);
            // Show all requests that are not completed or rejected so HC can override.
            setRequests(res.data.filter(r =>
                !['approved_by_hc', 'completed', 'rejected'].includes(r.status)
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchReport = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const queryParams = new URLSearchParams(filters).toString();
            const res = await axios.get(`/api/cars?${queryParams}`, config);

            // Filter out requests still pending approval - only show completed workflow items
            const completedRequests = res.data.filter(r =>
                ['approved_by_hc', 'completed', 'rejected'].includes(r.status)
            );
            setReportData(completedRequests);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDrivers = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const res = await axios.get('/api/drivers_management', config);
            setDrivers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchVehicles = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const res = await axios.get('/api/vehicles', config);
            setVehicles(res.data);
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
        fetchDrivers();
        fetchVehicles();
    }, [user.token, filters]);

    const handleAction = (request, act) => {
        setCurrentRequest(request);
        setAction(act);
        setComment('');
        setAllocation({
            driver_allocated: request.driver_allocated || '',
            assigned_driver_id: request.assigned_driver_id || '',
            vehicle_allocated: request.vehicle_allocated || '',
            reg_no: request.reg_no || ''
        });
        setShowModal(true);
    };

    const submitAction = async () => {
        if (action === 'approve') {
            if (!allocation.vehicle_allocated || !allocation.reg_no || !allocation.assigned_driver_id) {
                alert('Vehicle, Registration Number, and Driver are all required to approve a request.');
                return;
            }
        }

        try {
            const config = { headers: { 'x-auth-token': user.token } };
            let status = action === 'approve' ? 'approved_by_hc' : 'rejected';

            await axios.put(`/api/cars/${currentRequest.id}`, {
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

    // --- Driver CRUD Handlers ---
    const handleDriverSubmit = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            if (manageDriverMode === 'add') {
                await axios.post('/api/drivers_management', driverFormData, config);
            } else {
                await axios.put(`/api/drivers_management/${driverFormData.id}`, driverFormData, config);
            }
            setShowManageDriverModal(false);
            fetchDrivers();
        } catch (err) {
            console.error(err);
            alert('Operation failed');
        }
    };

    const handleDeleteDriver = async (id) => {
        if (!window.confirm('Delete this driver?')) return;
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            await axios.delete(`/api/drivers_management/${id}`, config);
            fetchDrivers();
        } catch (err) {
            console.error(err);
        }
    };

    // --- Vehicle CRUD Handlers ---
    const handleVehicleSubmit = async () => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            if (manageVehicleMode === 'add') {
                await axios.post('/api/vehicles', vehicleFormData, config);
            } else {
                await axios.put(`/api/vehicles/${vehicleFormData.id}`, vehicleFormData, config);
            }
            setShowManageVehicleModal(false);
            fetchVehicles();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDeleteVehicle = async (id) => {
        if (!window.confirm('Delete this vehicle?')) return;
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            await axios.delete(`/api/vehicles/${id}`, config);
            fetchVehicles();
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved_by_hc': return <Badge bg="success">HC Approved & Allocated</Badge>;
            case 'completed': return <Badge bg="dark">Trip Completed</Badge>;
            case 'approved_by_md': return <Badge bg="primary">MD Approved</Badge>;
            case 'approved_by_ops_manager': return <Badge bg="info">Ops Manager Approved</Badge>;
            case 'approved_by_dept_head': return <Badge bg="info">Dept Head Approved</Badge>;
            case 'approved_by_line_manager': return <Badge bg="primary">Line Manager Approved</Badge>;
            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
            default: return <Badge bg="warning">Pending Manager Approval</Badge>;
        }
    };

    const handleView = async (request) => {
        try {
            const config = { headers: { 'x-auth-token': user.token } };
            const logsRes = await axios.get(`/api/cars/${request.id}/logs`, config);
            setRequestDetails({ ...request, logs: logsRes.data });
            setViewModal(true);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setRequestDetails(request);
            setViewModal(true);
        }
    };

    return (
        <div className="pb-5">
            <h2 className="mb-4" style={{ color: '#009639' }}>HC Dashboard</h2>

            {/* KPI Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="text-center shadow-sm border-start border-4 border-warning h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Pending Approvals</h6>
                            <h2 className="mb-0 text-warning">{requests.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-start border-4 border-dark h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Completed / Allocated Trips</h6>
                            <h2 className="mb-0 text-dark">
                                {reportData.filter(r => ['completed', 'approved_by_hc'].includes(r.status)).length}
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-start border-4 border-danger h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Rejected Requests</h6>
                            <h2 className="mb-0 text-danger">
                                {reportData.filter(r => r.status === 'rejected').length}
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="active" className="mb-4 custom-tabs">
                <Tab eventKey="active" title="Pending Approvals">
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
                                                    <div className="d-flex align-items-center">
                                                        <Button size="sm" variant="success" className="me-2" onClick={() => handleAction(req, 'approve')}>Process Allocation</Button>
                                                        <Button size="sm" variant="danger" className="me-2" onClick={() => handleAction(req, 'reject')}>Reject</Button>
                                                        <Button size="sm" variant="outline-primary" onClick={() => handleView(req)} title="View History">
                                                            👁️
                                                        </Button>
                                                    </div>
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
                            <div className="bg-light p-4 rounded mb-4 border">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 text-muted">FILTER & SORT OPTIONS</h6>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setFilters({
                                            status: '',
                                            department: '',
                                            startDate: '',
                                            endDate: '',
                                            sortBy: 'created_at',
                                            order: 'DESC'
                                        })}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>

                                <Row className="g-3">
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">Status</Form.Label>
                                        <Form.Select
                                            value={filters.status}
                                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                                            size="sm"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="approved_by_hc">HC Approved & Allocated</option>
                                            <option value="completed">Trip Completed</option>
                                            <option value="rejected">Rejected</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">Department</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Filter by department..."
                                            value={filters.department}
                                            onChange={e => setFilters({ ...filters, department: e.target.value })}
                                            size="sm"
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">From Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filters.startDate}
                                            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                            size="sm"
                                        />
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">To Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={filters.endDate}
                                            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                            size="sm"
                                        />
                                    </Col>
                                </Row>

                                <Row className="g-3 mt-2">
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">Sort By</Form.Label>
                                        <Form.Select
                                            value={filters.sortBy}
                                            onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
                                            size="sm"
                                        >
                                            <option value="created_at">Submission Date</option>
                                            <option value="date_out">Trip Date</option>
                                            <option value="full_name">Requester Name</option>
                                            <option value="department">Department</option>
                                            <option value="status">Status</option>
                                        </Form.Select>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Label className="fw-semibold small">Order</Form.Label>
                                        <Form.Select
                                            value={filters.order}
                                            onChange={e => setFilters({ ...filters, order: e.target.value })}
                                            size="sm"
                                        >
                                            <option value="DESC">Newest First</option>
                                            <option value="ASC">Oldest First</option>
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

                <Tab eventKey="manage" title="Manage Drivers & Vehicles">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5>Drivers</h5>
                                        <Button variant="success" size="sm" onClick={() => {
                                            setManageDriverMode('add');
                                            setDriverFormData({ id: '', full_name: '', phone: '' });
                                            setShowManageDriverModal(true);
                                        }}>+ Add Driver</Button>
                                    </div>
                                    <Table striped hover responsive size="sm">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Phone</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drivers.map(d => (
                                                <tr key={d.id}>
                                                    <td>{d.full_name}</td>
                                                    <td>{d.phone || '-'}</td>
                                                    <td>
                                                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => {
                                                            setManageDriverMode('edit');
                                                            setDriverFormData(d);
                                                            setShowManageDriverModal(true);
                                                        }}>Edit</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteDriver(d.id)}>Delete</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {drivers.length === 0 && <tr><td colSpan="3" className="text-center">No drivers found.</td></tr>}
                                        </tbody>
                                    </Table>
                                </Col>
                                <Col md={6}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5>Vehicles</h5>
                                        <Button variant="success" size="sm" onClick={() => {
                                            setManageVehicleMode('add');
                                            setVehicleFormData({ id: '', vehicle_name: '', reg_no: '' });
                                            setShowManageVehicleModal(true);
                                        }}>+ Add Vehicle</Button>
                                    </div>
                                    <Table striped hover responsive size="sm">
                                        <thead>
                                            <tr>
                                                <th>Vehicle Name</th>
                                                <th>Reg No</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vehicles.map(v => (
                                                <tr key={v.id}>
                                                    <td>{v.vehicle_name}</td>
                                                    <td>{v.reg_no}</td>
                                                    <td>
                                                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => {
                                                            setManageVehicleMode('edit');
                                                            setVehicleFormData(v);
                                                            setShowManageVehicleModal(true);
                                                        }}>Edit</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteVehicle(v.id)}>Delete</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {vehicles.length === 0 && <tr><td colSpan="3" className="text-center">No vehicles found.</td></tr>}
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
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
                                    <Form.Select
                                        value={allocation.assigned_driver_id}
                                        onChange={(e) => {
                                            const drv = drivers.find(d => d.id === parseInt(e.target.value));
                                            setAllocation({
                                                ...allocation,
                                                assigned_driver_id: e.target.value,
                                                driver_allocated: drv ? drv.full_name : ''
                                            });
                                        }}
                                    >
                                        <option value="">Select Driver</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>{d.full_name}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Vehicle Allocated</Form.Label>
                                    <Form.Select
                                        value={vehicles.find(v => v.reg_no === allocation.reg_no)?.id || ''}
                                        onChange={(e) => {
                                            const v = vehicles.find(veh => veh.id === parseInt(e.target.value));
                                            if (v) {
                                                setAllocation({
                                                    ...allocation,
                                                    vehicle_allocated: v.vehicle_name,
                                                    reg_no: v.reg_no
                                                });
                                            } else {
                                                setAllocation({ ...allocation, vehicle_allocated: '', reg_no: '' });
                                            }
                                        }}
                                    >
                                        <option value="">Select Vehicle</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.vehicle_name} - {v.reg_no}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Label>Registration No.</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={allocation.reg_no}
                                        disabled
                                        placeholder="Auto-filled from vehicle selection"
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
            {/* View Details Modal with Timeline */}
            <Modal show={viewModal} onHide={() => setViewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Request Details & History</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {requestDetails && (
                        <div>
                            <div className="mb-4">
                                <h6 className="text-muted small text-uppercase mb-3">Approval Path</h6>
                                <div className="d-flex justify-content-between mb-2">
                                    {(() => {
                                        const getSteps = (level) => {
                                            switch (level) {
                                                case 'none': return ['Submitted', 'Line Manager', 'HC Final'];
                                                case 'sub_department': return ['Submitted', 'Dept Head', 'HC Final'];
                                                case 'department': return ['Submitted', 'Ops Manager', 'HC Final'];
                                                case 'operation': return ['Submitted', 'Managing Director', 'HC Final'];
                                                case 'board': return ['Submitted', 'Managing Director', 'HC Final'];
                                                case 'md': return ['Submitted', 'HC Final'];
                                                default: return ['Submitted', 'Manager', 'HC Final'];
                                            }
                                        };
                                        const steps = getSteps(requestDetails.requester_manager_level);
                                        const currentStepIdx = requestDetails.status === 'pending' ? 0 :
                                            requestDetails.status === 'approved_by_hc' ? steps.length :
                                                requestDetails.status === 'rejected' ? -1 : 1;

                                        return steps.map((s, i) => (
                                            <div key={i} className="text-center" style={{ width: `${100 / steps.length}%` }}>
                                                <Badge bg={
                                                    requestDetails.status === 'rejected' && i > 0 ? 'danger' :
                                                        (currentStepIdx > i || requestDetails.status === 'approved_by_hc') ? 'success' :
                                                            (currentStepIdx === i ? 'warning' : 'secondary')
                                                } className="rounded-circle p-2 mb-1">
                                                    {requestDetails.status === 'rejected' && i > 0 ? '×' : (i + 1)}
                                                </Badge>
                                                <br />
                                                <small className="fw-bold">{s}</small>
                                            </div>
                                        ));
                                    })()}
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                    <div className={`progress-bar bg-${requestDetails.status === 'rejected' ? 'danger' : 'success'}`} role="progressbar" style={{
                                        width: requestDetails.status === 'approved_by_hc' ? '100.001%' :
                                            requestDetails.status === 'pending' ? '15%' :
                                                requestDetails.status === 'rejected' ? '100%' : '50%'
                                    }}></div>
                                </div>
                            </div>

                            <Row className="mb-3">
                                <Col md={6}>
                                    <p className="mb-1"><strong>Requester:</strong> {requestDetails.full_name}</p>
                                    <p className="mb-1"><strong>Department:</strong> {requestDetails.department}</p>
                                    <p className="mb-1"><strong>Purpose:</strong> {requestDetails.purpose}</p>
                                </Col>
                                <Col md={6}>
                                    <p className="mb-1"><strong>Car Model:</strong> {requestDetails.car_model}</p>
                                    <p className="mb-1"><strong>Destination:</strong> {requestDetails.location}</p>
                                    <p className="mb-1"><strong>Schedule:</strong> {new Date(requestDetails.date_out).toLocaleDateString()} - {new Date(requestDetails.date_back).toLocaleDateString()}</p>
                                </Col>
                            </Row>

                            <h6 className="mt-4 mb-3 border-bottom pb-2">Full Approval History</h6>
                            <div className="timeline">
                                {requestDetails.logs && requestDetails.logs.length > 0 ? (
                                    requestDetails.logs.map((log, index) => (
                                        <div key={log.id} className="d-flex mb-3">
                                            <div className="me-3">
                                                <Badge bg={log.action === 'REJECTED' ? 'danger' : 'success'} className="rounded-circle p-2">
                                                    {index + 1}
                                                </Badge>
                                            </div>
                                            <div>
                                                <strong>{log.action}</strong> - <small className="text-muted">{new Date(log.created_at).toLocaleString()}</small>
                                                <div className="text-muted small">By: {log.actor_name}</div>
                                                {log.comment && <div className="mt-1 small fst-italic text-secondary">"{log.comment}"</div>}
                                            </div>
                                        </div>
                                    ))
                                ) : <p className="text-muted small">No logs found.</p>}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setViewModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Manage Driver Modal */}
            <Modal show={showManageDriverModal} onHide={() => setShowManageDriverModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{manageDriverMode === 'add' ? 'Add Driver' : 'Edit Driver'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control type="text" value={driverFormData.full_name} onChange={e => setDriverFormData({ ...driverFormData, full_name: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control type="text" value={driverFormData.phone} onChange={e => setDriverFormData({ ...driverFormData, phone: e.target.value })} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowManageDriverModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleDriverSubmit}>Save</Button>
                </Modal.Footer>
            </Modal>

            {/* Manage Vehicle Modal */}
            <Modal show={showManageVehicleModal} onHide={() => setShowManageVehicleModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{manageVehicleMode === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Vehicle Name/Model</Form.Label>
                        <Form.Control type="text" value={vehicleFormData.vehicle_name} onChange={e => setVehicleFormData({ ...vehicleFormData, vehicle_name: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Registration Number</Form.Label>
                        <Form.Control type="text" value={vehicleFormData.reg_no} onChange={e => setVehicleFormData({ ...vehicleFormData, reg_no: e.target.value })} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowManageVehicleModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleVehicleSubmit}>Save</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default HCDashboard;

