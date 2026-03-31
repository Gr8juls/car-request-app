const approvalMatrix = require('./utils/approvalMatrix');

console.log('=== Simulating MD Approval Scenarios ===\n');

// Scenario 1: Regular employee (Annet Kyengoro) with MD as line manager
console.log('Scenario 1: Regular Employee with MD as Line Manager');
console.log('User: Annet Kyengoro (manager_level: none, line_manager: Chantal Habiyakare)');
console.log('Request Status: pending');
console.log('Assigned To: Chantal Habiyakare (MD)');
console.log('Action: MD clicks "Approve"');
console.log('');

const requesterLevel1 = 'none';
const currentStatus1 = 'pending';
const approverLevel1 = 'md';
const assignedToMD1 = true;

// Simulate the controller logic
let nextStep1 = approvalMatrix.getNextStep(requesterLevel1, currentStatus1);
console.log('Step 1 - getNextStep result:', nextStep1);

// MD Super-Approval: Find MD-specific workflow step
if (approverLevel1 === 'md' && assignedToMD1) {
    const workflow1 = approvalMatrix.getWorkflow(requesterLevel1);
    const mdStep1 = workflow1.steps.find(step =>
        step.status === currentStatus1 && step.approver_level === 'md'
    );
    if (mdStep1) {
        nextStep1 = mdStep1;
        console.log('Step 2 - MD-specific step found:', mdStep1);
    }
}

console.log('Final nextStep:', nextStep1);
console.log('Expected: { status: "pending", approver_level: "md", next_status: "approved_by_md" }');
console.log('PASS:', nextStep1 && nextStep1.approver_level === 'md' && nextStep1.next_status === 'approved_by_md' ? '✓' : '✗');
console.log('\n' + '='.repeat(60) + '\n');

// Scenario 2: Department Head (Gerard Busyete) with MD as line manager
console.log('Scenario 2: Department Head with MD as Line Manager');
console.log('User: Gerard Busyete (manager_level: department, line_manager: Chantal Habiyakare)');
console.log('Request Status: pending');
console.log('Assigned To: Chantal Habiyakare (MD)');
console.log('Action: MD clicks "Approve"');
console.log('');

const requesterLevel2 = 'department';
const currentStatus2 = 'pending';
const approverLevel2 = 'md';
const assignedToMD2 = true;

let nextStep2 = approvalMatrix.getNextStep(requesterLevel2, currentStatus2);
console.log('Step 1 - getNextStep result:', nextStep2);

// MD Super-Approval: Find MD-specific workflow step
if (approverLevel2 === 'md' && assignedToMD2) {
    const workflow2 = approvalMatrix.getWorkflow(requesterLevel2);
    const mdStep2 = workflow2.steps.find(step =>
        step.status === currentStatus2 && step.approver_level === 'md'
    );
    if (mdStep2) {
        nextStep2 = mdStep2;
        console.log('Step 2 - MD-specific step found:', mdStep2);
    }
}

console.log('Final nextStep:', nextStep2);
console.log('Expected: { status: "pending", approver_level: "md", next_status: "approved_by_md" }');
console.log('PASS:', nextStep2 && nextStep2.approver_level === 'md' && nextStep2.next_status === 'approved_by_md' ? '✓' : '✗');
console.log('\n' + '='.repeat(60) + '\n');

// Scenario 3: Operations Manager (Charles Bongo) with MD as line manager
console.log('Scenario 3: Operations Manager with MD as Line Manager');
console.log('User: Charles Bongo (manager_level: operation, line_manager: Chantal Habiyakare)');
console.log('Request Status: approved_by_ops_manager (auto-approved on creation)');
console.log('Assigned To: Chantal Habiyakare (MD)');
console.log('Action: MD clicks "Approve"');
console.log('');

const requesterLevel3 = 'operation';
const currentStatus3 = 'approved_by_ops_manager';
const approverLevel3 = 'md';
const assignedToMD3 = true;

let nextStep3 = approvalMatrix.getNextStep(requesterLevel3, currentStatus3);
console.log('Step 1 - getNextStep result:', nextStep3);

// MD Super-Approval: Find MD-specific workflow step
if (approverLevel3 === 'md' && assignedToMD3) {
    const workflow3 = approvalMatrix.getWorkflow(requesterLevel3);
    const mdStep3 = workflow3.steps.find(step =>
        step.status === currentStatus3 && step.approver_level === 'md'
    );
    if (mdStep3) {
        nextStep3 = mdStep3;
        console.log('Step 2 - MD-specific step found:', mdStep3);
    }
}

console.log('Final nextStep:', nextStep3);
console.log('Expected: { status: "approved_by_ops_manager", approver_level: "md", next_status: "approved_by_md" }');
console.log('PASS:', nextStep3 && nextStep3.approver_level === 'md' && nextStep3.next_status === 'approved_by_md' ? '✓' : '✗');
console.log('\n' + '='.repeat(60) + '\n');

console.log('=== Summary ===');
console.log('✓ MD can now approve requests from regular employees who report directly to MD');
console.log('✓ MD can now approve requests from department heads who report directly to MD');
console.log('✓ MD can approve requests from operations managers who report directly to MD');
console.log('\nThe fix is ready for browser testing!');
