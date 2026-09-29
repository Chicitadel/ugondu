import os
import json
import uuid
import time
import urllib.request
import urllib.error

class EvidenceCollectorClient:
    def __init__(self, token=None, base_url=None, timeout_ms=2000, max_retries=3):
        self.base_url = base_url or os.environ.get('COLLECTOR_URL', 'http://localhost:3000')
        self.token = token or os.environ.get('COLLECTOR_TOKEN')
        self.timeout_sec = timeout_ms / 1000.0
        self.max_retries = max_retries
        
        if not self.token:
            raise ValueError('EvidenceCollectorClient requires a valid Bearer token for authentication.')

    def validate_schema(self, payload):
        if not isinstance(payload, dict): return False
        if payload.get('schemaVersion') != '2.0': return False
        if not all(k in payload for k in ('repository', 'pipeline', 'metadata')): return False
        return True

    def submit(self, payload):
        if not self.validate_schema(payload):
            raise ValueError('LocalValidationError: Payload fails schemaVersion 2.0 requirements')
        
        body = json.dumps(payload).encode('utf-8')
        req_id = str(uuid.uuid4())
        
        return self._request_with_retry(body, req_id, 0)

    def _request_with_retry(self, body, req_id, attempt):
        req = urllib.request.Request(f"{self.base_url}/api/v1/collector", data=body, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('Accept', 'application/vnd.airroofers.evidence+json;version=1')
        req.add_header('Authorization', f'Bearer {self.token}')
        req.add_header('X-Request-ID', req_id)
        req.add_header('X-Correlation-ID', req_id)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                return {
                    'status': response.status,
                    'data': json.loads(response.read().decode('utf-8'))
                }
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                return self._handle_retry(body, req_id, attempt, Exception(f"Server returned {e.code}"))
            raise Exception(f"Collector rejected payload: {e.code} - {e.read().decode('utf-8')}")
        except Exception as e:
            return self._handle_retry(body, req_id, attempt, e)

    def _handle_retry(self, body, req_id, attempt, error):
        if attempt >= self.max_retries:
            print(f"[SDK WARNING] Collector unreachable after {self.max_retries} attempts. Fallback to local log.")
            raise Exception(f"MaxRetriesExceeded: {str(error)}")
        
        backoff = (2 ** attempt) * 0.1 + 0.05 # 100ms base + jitter
        time.sleep(backoff)
        return self._request_with_retry(body, req_id, attempt + 1)
