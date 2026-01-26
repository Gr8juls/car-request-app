import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        job_title: '',
        department_id: '',
        sub_department_id: '',
        manager_level: 'none'
    });

    const [departments, setDepartments] = useState([]);
    const [subDepartments, setSubDepartments] = useState([]);
    const [error, setError] = useState('');

    const { email, password, full_name, job_title, department_id, sub_department_id, manager_level } = formData;

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/departments');
                setDepartments(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchDepartments();
    }, []);

    useEffect(() => {
        const fetchSubDepartments = async () => {
            if (department_id) {
                try {
                    const res = await axios.get(`http://localhost:5000/api/departments/sub?department_id=${department_id}`);
                    setSubDepartments(res.data);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setSubDepartments([]);
            }
        };
        fetchSubDepartments();
    }, [department_id]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        // Basic Validation
        if (manager_level === 'sub_department' && !sub_department_id) {
            return setError('Sub-department is required for Line Managers');
        }
        if (manager_level === 'department' && !department_id) {
            return setError('Department is required for Department Heads');
        }

        try {
            const dataToSubmit = {
                ...formData,
                role: manager_level !== 'none' ? 'manager' : 'employee'
            };
            await axios.post('http://localhost:5000/api/auth/register', dataToSubmit);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="d-flex justify-content-center">
            <Card style={{ width: '500px' }}>
                <Card.Body>
                    <Card.Title>Register</Card.Title>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={onSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="full_name"
                                value={full_name}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={email}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={password}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Role Type</Form.Label>
                            <Form.Select name="manager_level" value={manager_level} onChange={onChange} required>
                                <option value="none">Regular Employee</option>
                                <option value="sub_department">Line Manager (Channel Manager)</option>
                                <option value="department">Department Head</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Department</Form.Label>
                            <Form.Select name="department_id" value={department_id} onChange={onChange} required>
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Sub-Department</Form.Label>
                            <Form.Select name="sub_department_id" value={sub_department_id} onChange={onChange} required={manager_level === 'sub_department'} disabled={!department_id}>
                                <option value="">Select Sub-Department</option>
                                {subDepartments.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Job Title</Form.Label>
                            <Form.Control
                                type="text"
                                name="job_title"
                                value={job_title}
                                onChange={onChange}
                                required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100">
                            Register
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Register;
