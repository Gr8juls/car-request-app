import React, { useEffect, useState } from 'react';
import { Table, Button, Badge, Form, Modal, Tabs, Tab, Card, Row, Col, Dropdown, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const HCDashboard = ({ user }) => {
    const [requests, setRequests] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [action, setAction] = useState(''); // 'approve' or 'reject'
    const [comment, setComment] = useState('');
    const [allocation, setAllocation] = useState({
        driver_allocated: '',
        assigned_driver_id: '',
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

    const fetchDrivers = async () => {
        try {
            // Fetch only drivers using the dedicated carRequests endpoint
            const config = { headers: { 'x-auth-token': user.token } };
            const res = await axios.get('http://localhost:5000/api/cars/drivers', config);
            setDrivers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = (format) => {
        if (reportData.length === 0) {
            alert("No data to export");
            return;
        }

        switch (format) {
            case 'csv':
                exportToCSV();
                break;
            case 'pdf':
                exportToPDF();
                break;
            case 'excel':
                exportToExcel();
                break;
            case 'word':
                exportToWord();
                break;
            default:
                exportToCSV();
        }
    };

    const exportToCSV = () => {
        const headers = ["Request ID", "Date Submitted", "User", "Department", "Trip Date", "Time Out", "Return Date", "Time Back", "Car Model", "Purpose", "Status", "Allocated Vehicle", "Reg No", "Driver"];
        const csvContent = [
            headers.join(","),
            ...reportData.map(req => [
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
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, `car_requests_report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Car Request Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Date", "User", "Dept", "Car Model", "Status", "Driver"];
        const tableRows = reportData.map(req => [
            new Date(req.created_at).toLocaleDateString(),
            req.full_name,
            req.department,
            req.car_model,
            req.status.replace(/_/g, ' '),
            req.driver_allocated || 'N/A'
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [0, 150, 57] } // Old Mutual Green
        });

        doc.save(`car_requests_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(reportData.map(req => ({
            "Request ID": req.id,
            "Date Submitted": new Date(req.created_at).toLocaleDateString(),
            "User": req.full_name,
            "Department": req.department,
            "Trip Date": new Date(req.date_out).toLocaleDateString(),
            "Time Out": req.time_out,
            "Return Date": new Date(req.date_back).toLocaleDateString(),
            "Time Back": req.time_back,
            "Car Model": req.car_model,
            "Purpose": req.purpose,
            "Status": req.status,
            "Allocated Vehicle": req.vehicle_allocated,
            "Reg No": req.reg_no,
            "Driver": req.driver_allocated
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
        XLSX.writeFile(workbook, `car_requests_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const exportToWord = async () => {
        const tableHeaderRows = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Date", style: "HeaderStyle" })] }),
                new TableCell({ children: [new Paragraph({ text: "User", style: "HeaderStyle" })] }),
                new TableCell({ children: [new Paragraph({ text: "Department", style: "HeaderStyle" })] }),
                new TableCell({ children: [new Paragraph({ text: "Car Model", style: "HeaderStyle" })] }),
                new TableCell({ children: [new Paragraph({ text: "Status", style: "HeaderStyle" })] }),
            ],
            tableHeader: true,
        });

        const tableBodyRows = reportData.map(req => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(new Date(req.created_at).toLocaleDateString())] }),
                new TableCell({ children: [new Paragraph(req.full_name)] }),
                new TableCell({ children: [new Paragraph(req.department)] }),
                new TableCell({ children: [new Paragraph(req.car_model)] }),
                new TableCell({ children: [new Paragraph(req.status.replace(/_/g, ' '))] }),
            ],
        }));

        const table = new DocxTable({
            rows: [tableHeaderRows, ...tableBodyRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
        });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: "Car Request Report",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                        text: `Generated on: ${new Date().toLocaleString()}`,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: "" }), // spacer
                    table,
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `car_requests_report_${new Date().toISOString().slice(0, 10)}.docx`);
    };

    useEffect(() => {
        fetchRequests();
        fetchReport();
        fetchDrivers();
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
            case 'approved_by_dept_head': return <Badge bg="info">Manager of Managers Approved</Badge>;
            case 'approved_by_line_manager': return <Badge bg="primary">Manager of Others Approved</Badge>;
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
                                                        ((req.requester_manager_level === 'none' && (req.status === 'approved_by_line_manager' || req.status === 'pending')) ||
                                                            (req.requester_manager_level !== 'none' && req.status === 'approved_by_dept_head')) ? (
                                                            <Button size="sm" variant="success" onClick={() => handleAction(req, 'approve')}>Process Allocation</Button>
                                                        ) : (
                                                            <span className="small text-muted text-capitalize">
                                                                {req.status === 'pending' ? 'Pending Manager of Others' :
                                                                    req.status === 'approved_by_line_manager' ? 'Pending Manager of Managers' :
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
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h4 className="mb-1 text-dark fw-bold">Request History</h4>
                                    <p className="text-muted small mb-0">View and export all car request records</p>
                                </div>
                                <Dropdown as={ButtonGroup}>
                                    <Button variant="success" onClick={() => handleExport('pdf')}>
                                        <i className="bi bi-download me-2"></i>Export Report
                                    </Button>
                                    <Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
                                    <Dropdown.Menu align="end">
                                        <Dropdown.Item onClick={() => handleExport('pdf')}>
                                            <span className="me-2 text-danger">PDF</span> Export as PDF
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleExport('excel')}>
                                            <span className="me-2 text-success">EXCEL</span> Export as Excel
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => handleExport('word')}>
                                            <span className="me-2 text-primary">WORD</span> Export as Word
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={() => handleExport('csv')}>
                                            <span className="me-2 text-secondary">CSV</span> Export as CSV
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>

                            <div className="bg-white p-4 rounded shadow-sm mb-4 border" style={{ backgroundColor: '#f8f9fa' }}>
                                <Row className="g-4">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">Status</Form.Label>
                                            <Form.Select className="form-select-sm border-0 bg-light" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                                                <option value="">All Statuses</option>
                                                <option value="pending">Pending Manager of Others</option>
                                                <option value="approved_by_line_manager">Pending Manager of Managers</option>
                                                <option value="approved_by_dept_head">Pending HC</option>
                                                <option value="approved_by_hc">HC Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">Department</Form.Label>
                                            <Form.Control className="form-control-sm border-0 bg-light" type="text" placeholder="Filter dept..." value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">From Date</Form.Label>
                                            <Form.Control className="form-control-sm border-0 bg-light" type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">To Date</Form.Label>
                                            <Form.Control className="form-control-sm border-0 bg-light" type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">Sort By</Form.Label>
                                            <Form.Select className="form-select-sm border-0 bg-light" value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}>
                                                <option value="created_at">Submission Date</option>
                                                <option value="date_out">Trip Date</option>
                                                <option value="car_model">Car Model</option>
                                                <option value="status">Status</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold text-uppercase text-muted">Order</Form.Label>
                                            <Form.Select className="form-select-sm border-0 bg-light" value={filters.order} onChange={e => setFilters({ ...filters, order: e.target.value })}>
                                                <option value="DESC">Descending</option>
                                                <option value="ASC">Ascending</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6} className="d-flex align-items-end justify-content-end">
                                        <Button variant="link" className="text-decoration-none text-muted small" onClick={() => setFilters({ status: '', department: '', startDate: '', endDate: '', sortBy: 'created_at', order: 'DESC' })}>
                                            Reset Filters
                                        </Button>
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
