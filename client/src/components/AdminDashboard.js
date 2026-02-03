import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Badge } from 'react-bootstrap';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);

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
        manager_level: 'none'
    });

    const [departments, setDepartments] = useState([]);
    const [subDepartments, setSubDepartments] = useState([]);
    const [filteredSubDepts, setFilteredSubDepts] = useState([]); // For the filter in Dashboard or Modal

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSubDepartments = async (deptId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/departments/sub?department_id=${deptId}`);
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
            await axios.post('http://localhost:5000/api/admin/promote', {
                userId: selectedUser.id,
                subDepartmentId: selectedSubDept
            });
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
            manager_level: 'none'
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
            manager_level: user.manager_level || 'none'
        });
        if (user.department_id) {
            fetchSubDepartments(user.department_id);
        } else {
            setFilteredSubDepts([]);
        }
        setShowUserModal(true);
    };

    const handleDeleteUserClick = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await axios.delete(`http://localhost:5000/api/admin/users/${userId}`);
                fetchUsers();
            } catch (err) {
                console.error(err);
                alert('Failed to delete user');
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
        try {
            if (userModalMode === 'add') {
                await axios.post('http://localhost:5000/api/admin/users', userFormData);
            } else {
                await axios.put(`http://localhost:5000/api/admin/users/${userFormData.id}`, userFormData);
            }
            setShowUserModal(false);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Operation failed');
        }
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Admin Dashboard</h2>
                <Button variant="success" onClick={handleAddUserClick}>+ Add New User</Button>
            </div>

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Name / Email</th>
                        <th>Role / Level</th>
                        <th>Dept / Sub-Dept</th>
                        <th>Job Title</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>
                                <strong>{user.full_name}</strong><br />
                                <small className="text-muted">{user.email}</small>
                            </td>
                            <td>
                                {user.role}<br />
                                <Badge bg="secondary">{user.manager_level}</Badge>
                            </td>
                            <td>
                                {user.department_name || '-'} <br />
                                <small className="text-muted">{user.sub_department_name}</small>
                            </td>
                            <td>{user.job_title || '-'}</td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2 mb-1" onClick={() => handleEditUserClick(user)}>
                                    Edit
                                </Button>
                                {user.role !== 'admin' && (
                                    <>
                                        <Button variant="outline-success" size="sm" className="me-2 mb-1" onClick={() => handlePromoteClick(user)}>
                                            Allocate Manager
                                        </Button>
                                        <Button variant="outline-danger" size="sm" className="mb-1" onClick={() => handleDeleteUserClick(user.id)}>
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Promote / Allocate Manager Modal */}
            <Modal show={showPromoteModal} onHide={() => setShowPromoteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Allocate Manager of Others</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Assign <strong>{selectedUser?.full_name}</strong> as Manager of Others for:</p>
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
                                <option value="none">None</option>
                                <option value="sub_department">Manager of Others</option>
                                <option value="department">Manager of Managers</option>
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
        </div>
    );
};

export default AdminDashboard;
