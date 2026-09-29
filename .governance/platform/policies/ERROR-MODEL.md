# Platform Error Model

**Governance Status:** FROZEN
**Version:** 1.0.0

A consistent error model is crucial for automated orchestration, retry logic, and debugging across the enterprise ecosystem. Every platform API must return errors in this standard JSON envelope.

## Standard Error Envelope

```json
{
  "error": {
    "code": "string (Specific internal error code)",
    "message": "string (Human-readable description)",
    "correlation_id": "string (UUID for tracing)",
    "target": "string (Optional: the specific field or resource that caused the error)",
    "details": [
      {
        "code": "string",
        "message": "string",
        "target": "string"
      }
    ]
  }
}
```

## Standardized HTTP Codes
Platform APIs MUST map business outcomes to standard HTTP semantics:
- `400 Bad Request`: Malformed payload or validation failure.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Authenticated, but lacking role/permission (e.g., trying to access another org's invoice).
- `404 Not Found`: Resource does not exist or visibility rules prevent access.
- `409 Conflict`: Resource state prevents the action (e.g., activating an already active license).
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unexpected platform failure.

## Retry & Backoff Guidelines
If an API returns a `429` or `500`-level error:
- Consumers MUST implement an **exponential backoff** strategy (e.g., 1s, 2s, 4s, 8s).
- Consumers SHOULD introduce **jitter** to prevent thundering herds on recovery.
- Platforms SHOULD include a `Retry-After` header when returning `429` or `503`.
