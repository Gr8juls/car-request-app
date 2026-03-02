import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Badge, Tabs, Tab, Row, Col, Card } from 'react-bootstrap';

const AdminDashboard = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [carRequests, setCarRequests] = useState([]);

    const config = {
        headers: {
            'x-auth-token': user?.token
        }
    };

    // Promote/Allocate Modal State
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedSubDept, setSelectedSubDept] = useState('');
    const [selectedDeptForFilter, setSelectedDeptForFilter] = useState('');

    // User CRUD Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [userModalMode, setUserModalMode] = useState('add'); // 'add' or 'edit'
    const [userFormData, setUserFormData] = useState({
        id: '',
        email: '',
        full_name: '',
        password: '', // Only for creation or update
        role: 'employee',
        department_id: '',
        sub_department_id: '',
        job_title: '',
        manager_level: 'none',
        line_manager_id: ''
    });

    const [departments, setDepartments] = useState([]);
    const [subDepartments, setSubDepartments] = useState([]);
    const [filteredSubDepts, setFilteredSubDepts] = useState([]); // For the filter in Dashboard or Modal

    // Audit State
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditUser, setAuditUser] = useState(null);

    // Filters
    const [roleFilter, setRoleFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
        fetchCarRequests();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`/api/admin/users`, config);
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCarRequests = async () => {
        try {
            const res = await axios.get(`/api/cars`, config);
            setCarRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/departments', config);
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSubDepartments = async (deptId) => {
        try {
            const res = await axios.get(`/api/departments/sub?department_id=${deptId}`, config);
            setFilteredSubDepts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // --- Promote / Allocate Manager ---
    const handlePromoteClick = (user) => {
        setSelectedUser(user);
        setSelectedDeptForFilter(user.department_id || '');
        if (user.department_id) {
            fetchSubDepartments(user.department_id);
        } else {
            setFilteredSubDepts([]);
        }
        setShowPromoteModal(true);
    };

    const handlePromoteDeptChange = (e) => {
        const deptId = e.target.value;
        setSelectedDeptForFilter(deptId);
        if (deptId) fetchSubDepartments(deptId);
        else setFilteredSubDepts([]);
    };

    const handlePromoteSubmit = async () => {
        if (!selectedUser || !selectedSubDept) return;
        try {
            await axios.post('/api/admin/promote', {
                userId: selectedUser.id,
                subDepartmentId: selectedSubDept
            }, config);
            setShowPromoteModal(false);
            fetchUsers();
            alert('User promoted successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to promote user');
        }
    };

    // --- User CRUD ---
    const handleAddUserClick = () => {
        setUserModalMode('add');
        setUserFormData({
            id: '',
            email: '',
            full_name: '',
            password: '',
            role: 'employee',
            department_id: '',
            sub_department_id: '',
            job_title: '',
            manager_level: 'none',
            line_manager_id: '',
            is_active: true
        });
        setFilteredSubDepts([]);
        setShowUserModal(true);
    };

    const handleEditUserClick = (user) => {
        setUserModalMode('edit');
        setUserFormData({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            password: '', // Don't fill password
            role: user.role,
            department_id: user.department_id || '',
            sub_department_id: user.sub_department_id || '',
            job_title: user.job_title || '',
            manager_level: user.manager_level || 'none',
            line_manager_id: user.line_manager_id || '',
            is_active: user.is_active === 1 || user.is_active === true
        });
        if (user.department_id) {
            fetchSubDepartments(user.department_id);
        } else {
            setFilteredSubDepts([]);
        }
        setShowUserModal(true);
    };

    const handleDeleteUserClick = async (userId) => {
        if (window.confirm('Are you sure you want to deactivate this user?')) {
            try {
                await axios.delete(`/api/admin/users/${userId}`, config);
                fetchUsers();
            } catch (err) {
                console.error(err);
                alert('Failed to deactivate user');
            }
        }
    };

    const handleViewAuditHistory = async (user) => {
        setAuditUser(user);
        try {
            const res = await axios.get(`/api/admin/audit/${user.id}`, config);
            setAuditLogs(res.data);
            setShowAuditModal(true);
        } catch (err) {
            console.error(err);
            alert('Failed to load audit history');
        }
    };

    const handleStatusToggle = async (user) => {
        const newStatus = !user.is_active;
        if (window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this user?`)) {
            try {
                await axios.put(`/api/admin/users/${user.id}`, { ...user, is_active: newStatus }, config);
                fetchUsers();
            } catch (err) {
                console.error(err);
                alert('Failed to update status');
            }
        }
    };

    const handleUserFormChange = (e) => {
        const { name, value } = e.target;
        setUserFormData({ ...userFormData, [name]: value });
        if (name === 'department_id') {
            if (value) {
                fetchSubDepartments(value);
            } else {
                setFilteredSubDepts([]);
            }
            // Clear sub dept if dept changes
            setUserFormData(prev => ({ ...prev, [name]: value, sub_department_id: '' }));

        }
    };

    const handleUserFormSubmit = async () => {
        // MD Validation (Frontend Check)
        if (userFormData.manager_level === 'md' && userFormData.is_active) {
            const existingMD = users.find(u => u.manager_level === 'md' && u.is_active && u.id !== userFormData.id);
            if (existingMD) {
                alert('Only one Managing Director can be active at a time.');
                return;
            }
        }

        try {
            if (userModalMode === 'add') {
                await axios.post('/api/admin/users', userFormData, config);
            } else {
                await axios.put(`/api/admin/users/${userFormData.id}`, userFormData, config);
            }
            setShowUserModal(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Operation failed');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesRole = roleFilter ? u.manager_level === roleFilter : true;
        const matchesDept = deptFilter ? u.department_id === parseInt(deptFilter) : true;
        const matchesStatus = statusFilter ? (statusFilter === 'active' ? u.is_active : !u.is_active) : true;
        return matchesRole && matchesDept && matchesStatus;
    });

    return (
        <div className="container mt-4 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Admin Dashboard</h2>
                <div>
                    <Button variant="outline-info" className="me-2" onClick={() => { fetchUsers(); fetchCarRequests(); }}>Refresh All</Button>
                    <Button variant="success" onClick={handleAddUserClick}>+ Add New User</Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center shadow-sm border-start border-4 border-primary h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Total Users</h6>
                            <h2 className="mb-0 text-primary">{users.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-start border-4 border-info h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Total Car Requests</h6>
                            <h2 className="mb-0 text-info">{carRequests.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-start border-4 border-warning h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Pending Requests</h6>
                            <h2 className="mb-0 text-warning">
                                {carRequests.filter(r => !['completed', 'rejected'].includes(r.status)).length}
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-start border-4 border-success h-100">
                        <Card.Body>
                            <h6 className="text-muted text-uppercase small">Completed Trips</h6>
                            <h2 className="mb-0 text-success">
                                {carRequests.filter(r => r.status === 'completed').length}
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="users" className="mb-4 custom-tabs">
                <Tab eventKey="users" title="Manage Users">
                    <Card className="shadow-sm border-0 mt-3 p-3">
                        <div className="row mb-3 g-2">
                            <div className="col-md-3">
                                <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                    <option value="">All Roles</option>
                                    <option value="none">Regular Employee</option>
                                    <option value="sub_department">Line Manager</option>
                                    <option value="department">Head of Department</option>
                                    <option value="operation">Operations Manager</option>
                                    <option value="md">Managing Director</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-3">
                                <Form.Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </Form.Select>
                            </div>
                            <div className="col-md-3">
                                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </Form.Select>
                            </div>
                        </div>

                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Name / Email</th>
                                    <th>Role / Level</th>
                                    <th>Dept / Sub-Dept</th>
                                    <th>Job Title</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className={!user.is_active ? 'table-secondary' : ''}>
                                        <td>
                                            <strong>{user.full_name}</strong><br />
                                            <small className="text-muted">{user.email}</small>
                                        </td>
                                        <td>
                                            {user.role}<br />
                                            <Badge bg={
                                                user.manager_level === 'md' ? 'danger' :
                                                    user.manager_level === 'operation' ? 'warning' :
                                                        user.manager_level === 'department' ? 'primary' :
                                                            user.manager_level === 'sub_department' ? 'info' : 'secondary'
                                            }>
                                                {user.manager_level === 'md' ? 'Managing Director' :
                                                    user.manager_level === 'operation' ? 'Ops Manager' :
                                                        user.manager_level === 'department' ? 'HoD' :
                                                            user.manager_level === 'sub_department' ? 'Line Manager' : 'Employee'}
                                            </Badge>
                                        </td>
                                        <td>
                                            {user.department_name || '-'} <br />
                                            <small className="text-muted">{user.sub_department_name}</small>
                                        </td>
                                        <td>{user.job_title || '-'}</td>
                                        <td>
                                            <Badge bg={user.is_active ? 'success' : 'danger'} style={{ cursor: 'pointer' }} onClick={() => handleStatusToggle(user)}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" className="me-2 mb-1" onClick={() => handleEditUserClick(user)}>
                                                Edit
                                            </Button>
                                            <Button variant="outline-info" size="sm" className="me-2 mb-1" onClick={() => handleViewAuditHistory(user)}>
                                                History
                                            </Button>
                                            {user.role !== 'admin' && (
                                                <>
                                                    <Button variant="outline-success" size="sm" className="me-2 mb-1" onClick={() => handlePromoteClick(user)}>
                                                        Allocate LM
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" className="mb-1" onClick={() => handleDeleteUserClick(user.id)}>
                                                        Deactivate
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="requests" title="All Car Requests">
                    <Card className="shadow-sm border-0 mt-3 p-3">
                        <Table striped hover responsive>
                            <thead style={{ backgroundColor: '#009639', color: 'white' }}>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Vehicle Model</th>
                                    <th>Destination</th>
                                    <th>Allocated Reg</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.id}</td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td>{req.full_name}</td>
                                        <td>{req.car_model}</td>
                                        <td>{req.location}</td>
                                        <td>{req.reg_no || <span className="text-muted">N/A</span>}</td>
                                        <td>
                                            <Badge bg={
                                                req.status === 'completed' ? 'secondary' :
                                                    req.status === 'rejected' ? 'danger' :
                                                        req.status === 'in_progress' ? 'warning' :
                                                            req.status === 'approved_by_hc' ? 'success' : 'info'
                                            }>
                                                {req.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {carRequests.length === 0 && (
                                    <tr><td colSpan="7" className="text-center py-4">No car requests found.</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>

            {/* Promote / Allocate Manager Modal */}
            <Modal show={showPromoteModal} onHide={() => setShowPromoteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Allocate Line Manager</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Assign <strong>{selectedUser?.full_name}</strong> as Line Manager for:</p>
                    <Form.Group className="mb-3">
                        <Form.Label>Department</Form.Label>
                        <Form.Select value={selectedDeptForFilter} onChange={handlePromoteDeptChange}>
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Sub-Department</Form.Label>
                        <Form.Select value={selectedSubDept} onChange={(e) => setSelectedSubDept(e.target.value)} disabled={!selectedDeptForFilter}>
                            <option value="">Select Sub-Department</option>
                            {filteredSubDepts.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPromoteModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handlePromoteSubmit}>Confirm Allocation</Button>
                </Modal.Footer>
            </Modal>

            {/* User Create/Edit Modal */}
            <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{userModalMode === 'add' ? 'Add New User' : 'Edit User'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control type="text" name="full_name" value={userFormData.full_name} onChange={handleUserFormChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name="email" value={userFormData.email} onChange={handleUserFormChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password {userModalMode === 'edit' && '(Leave blank to keep current)'}</Form.Label>
                            <Form.Control type="password" name="password" value={userFormData.password} onChange={handleUserFormChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Role</Form.Label>
                            <Form.Select name="role" value={userFormData.role} onChange={handleUserFormChange}>
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                                <option value="hc">HC</option>
                                <option value="admin">Admin</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Manager Level</Form.Label>
                            <Form.Select name="manager_level" value={userFormData.manager_level} onChange={handleUserFormChange}>
                                <option value="none">Regular Employee</option>
                                <option value="sub_department">Line Manager</option>
                                <option value="department">Head of Department</option>
                                <option value="operation">Operations Manager</option>
                                <option value="md">Managing Director</option>
                                <option value="board">Board Member</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="is-active-switch"
                                label="User Account Active"
                                name="is_active"
                                checked={userFormData.is_active}
                                onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Line Manager</Form.Label>
                            <Form.Select name="line_manager_id" value={userFormData.line_manager_id} onChange={handleUserFormChange}>
                                <option value="">Select Line Manager</option>
                                {users.filter(u => u.id !== userFormData.id).map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role} - {u.manager_level})</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Department</Form.Label>
                            <Form.Select name="department_id" value={userFormData.department_id} onChange={handleUserFormChange}>
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Sub-Department</Form.Label>
                            <Form.Select name="sub_department_id" value={userFormData.sub_department_id} onChange={handleUserFormChange} disabled={!userFormData.department_id}>
                                <option value="">Select Sub-Department</option>
                                {filteredSubDepts.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Job Title</Form.Label>
                            <Form.Control type="text" name="job_title" value={userFormData.job_title} onChange={handleUserFormChange} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUserFormSubmit}>{userModalMode === 'add' ? 'Create' : 'Save Changes'}</Button>
                </Modal.Footer>
            </Modal>

            {/* Audit History Modal */}
            <Modal show={showAuditModal} onHide={() => setShowAuditModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Audit History - {auditUser?.full_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table striped bordered hover size="sm">
                        <thead>
                            <tr>
                                <th>Date (UTC)</th>
                                <th>Action</th>
                                <th>Admin</th>
                                <th>Changes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.length === 0 ? (
                                <tr><td colSpan="4" className="text-center">No history found</td></tr>
                            ) : (
                                auditLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                        <td><Badge bg={log.action === 'DEACTIVATED' ? 'danger' : log.action === 'CREATED' ? 'success' : 'info'}>{log.action}</Badge></td>
                                        <td>{log.admin_name}</td>
                                        <td>
                                            <pre style={{ fontSize: '0.75rem', margin: 0 }}>
                                                {JSON.stringify(log.changed_fields, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAuditModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminDashboard;

