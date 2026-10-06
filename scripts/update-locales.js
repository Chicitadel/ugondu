const fs = require('fs');
const path = require('path');

const localesDir = 'D:/ujomor-platform/products/ugondu/server/shared/locales';
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const tokens = {
    'cert': {
        'phase': {
            'injecting_faults': '10. Injecting Faults / Drift Out-of-band',
            'diagnosis_repair': '11. DEISE Diagnosis and Native Repair',
            'repairing_drift': '12. DEISE Repair (Fixing Drift natively)',
            'urre_fault_injection': '13. URRE Fault Injection & Rollback (Same transaction DAG)',
            'testing_rollback': 'Fault caught, testing rollback on the same TX. Error: {error}',
            'cleanup': '14. Cleanup (Canonical Actions Only)',
            'residual_scan': '15. Residual Scan Verification'
        },
        'diagnoses': { 'found': 'Diagnoses found: {count}' },
        'residual_scan': { 'clean': 'Residual Scan: Clean!' },
        'run': { 'complete': '? Certification Run Complete.' },
        'fargate': {
            'start': '=== UGONDU COR-7 FARGATE LIFECYCLE CERTIFICATION ===',
            'campaign_id': 'Campaign ID: {id}',
            'action': {
                'registry_create': 'Triggering canonical action: container:registry:create',
                'image_build': 'Triggering canonical action: container:image:build',
                'image_push': 'Triggering canonical action: container:image:push',
                'taskdef_create1': 'Triggering canonical action: container:task-definition:create (Revision 1)',
                'service_create': 'Triggering canonical action: container:service:create (Deploy Revision 1)',
                'deploy_rev2': 'Triggering canonical action: orchestration:container:deploy (Revision 2)'
            },
            'polling': {
                'rev1': 'Polling ECS state for Revision 1 stabilization (no sleep)...',
                'rev2_fail': 'Polling ECS state for Revision 2 failure (no sleep)...',
                'rev1_after_rollback': 'Waiting for Revision 1 to stabilize after rollback...'
            },
            'deploying': { 'rev2': 'Deploying Revision 2 with invalid image digest...' },
            'trigger_rollback': 'Triggering rollback for transactionId: {txId}',
            'complete': '\n? Fargate Certification Run Complete.'
        }
    },
    'error': {
        'evidence': { 'integrity_check_failed': 'Evidence integrity check failed.' },
        'cert': {
            'simulated_fault': 'Simulated Fault during execution',
            'residual_scan_failed': 'Residual Scan FAILED! Resources leaked.',
            'missing_region': 'BLOCKED: UGONDU_CERT_REGION is required',
            'missing_creds': 'BLOCKED: UGONDU_CERT_RDS_CREDENTIAL_REF is required',
            'fargate': {
                'missing_digest': 'Missing physical image digest',
                'missing_taskdef_arn': 'Missing task definition ARN',
                'missing_service_arn': 'Missing service ARN',
                'rev1_fail': 'Revision 1 failed to stabilize',
                'missing_rev2_arn': 'Missing revision 2 task def ARN',
                'tx_load_fail': 'Failed to load durably persisted transaction: {txId}',
                'rev2_did_not_fail': 'Revision 2 did not fail as expected',
                'revert_fail': 'Failed to revert to Revision 1',
                'fatal': 'Fargate Certification run fatally failed'
            }
        }
    }
};

const deepMerge = (target, source) => {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            Object.assign(source[key], deepMerge(target[key] || {}, source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
};

for (const file of files) {
    const fullPath = path.join(localesDir, file);
    let data = {};
    try {
        data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch(e) {}
    
    deepMerge(data, tokens);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}
console.log('Locales updated successfully');
