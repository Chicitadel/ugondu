import sys
import os
import datetime

# Add sdk-python to path for import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__dirname), 'sdk-python', 'src')))
from collector import EvidenceCollectorClient

def run():
    print("Starting Bootstrap CI Pipeline...")
    
    evidence = {
        "schemaVersion": "2.0",
        "repository": {
            "name": "bootstrap",
            "commit": "9876zxcv5432"
        },
        "pipeline": {
            "id": "ci-run-444",
            "started": datetime.datetime.utcnow().isoformat() + "Z"
        },
        "metadata": {
            "runner": "gitlab_ci",
            "trigger": "manual"
        },
        "deploy": {
            "evidence": {
                "environment": "production",
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
        }
    }

    try:
        # In CI, token is injected via secrets
        client = EvidenceCollectorClient(
            token='bootstrap-token',
            base_url='http://localhost:3000'
        )
        
        print("Submitting evidence via Python SDK...")
        response = client.submit(evidence)
        print("Submission successful!", response['data'])
    except Exception as e:
        print("Pipeline Failed to submit evidence:", str(e))
        sys.exit(1)

if __name__ == "__main__":
    run()
