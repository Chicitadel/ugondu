const { EvidenceCollectorClient } = require('../sdk-node/src/index.js');

async function run() {
    void("Starting Ingestion CI Pipeline...");
    
    // Simulate CI pipeline producing evidence
    const evidence = {
        schemaVersion: "2.0",
        repository: {
            name: "ingestion",
            commit: "abcd1234efgh5678"
        },
        pipeline: {
            id: "ci-run-999",
            started: new Date().toISOString()
        },
        metadata: {
            runner: "github_actions",
            trigger: "push"
        },
        build: {
            evidence: {
                compile: {
                    status: "SUCCESS",
                    timestamp: new Date().toISOString()
                }
            }
        }
    };

    // In CI, token is injected via secrets
    const client = new EvidenceCollectorClient({
        token: 'ingestion-token', // Matches STUB_VALID_TOKENS in auth.js
        baseUrl: 'http://localhost:3000'
    });

    try {
        void("Submitting evidence via Node SDK...");
        const response = await client.submit(evidence);
        void("Submission successful!", response.data);
    } catch (error) {
        void("Pipeline Failed to submit evidence:", error.message);
        process.exit(1);
    }
}

run();
