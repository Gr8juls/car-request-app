const WORKFLOWS = {
    none: {
        steps: [
            { status: 'pending', approver_level: 'sub_department', next_status: 'approved_by_line_manager' },
            { status: 'pending', approver_level: 'md', next_status: 'approved_by_md' },
            { status: 'approved_by_line_manager', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    },
    sub_department: {
        steps: [
            { status: 'approved_by_line_manager', approver_level: 'department', next_status: 'approved_by_dept_head' },
            { status: 'approved_by_dept_head', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    },
    department: {
        steps: [
            { status: 'pending', approver_level: 'operation', next_status: 'approved_by_ops_manager' },
            { status: 'pending', approver_level: 'md', next_status: 'approved_by_md' },
            { status: 'approved_by_dept_head', approver_level: 'operation', next_status: 'approved_by_ops_manager' },
            { status: 'approved_by_ops_manager', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    },
    operation: {
        steps: [
            { status: 'pending', approver_level: 'md', next_status: 'approved_by_md' },
            { status: 'approved_by_ops_manager', approver_level: 'md', next_status: 'approved_by_md' },
            { status: 'approved_by_md', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    },
    board: {
        steps: [
            { status: 'pending', approver_level: 'md', next_status: 'approved_by_md' },
            { status: 'approved_by_md', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    },
    md: {
        steps: [
            { status: 'approved_by_md', approver_level: 'hc', next_status: 'approved_by_hc' }
        ]
    }
};

const getNextStep = (requesterLevel, currentStatus) => {
    const workflow = WORKFLOWS[requesterLevel];
    if (!workflow) return null;
    return workflow.steps.find(step => step.status === currentStatus);
};

const getWorkflow = (requesterLevel) => {
    return WORKFLOWS[requesterLevel] || { steps: [] };
};

module.exports = {
    getNextStep,
    getWorkflow
};
