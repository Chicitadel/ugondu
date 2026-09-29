# IDENTITY SESSION MODEL

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## Lifecycle
- **Revocation**: Instant revocation capability across all edge nodes via a centralized revocation list.
- **Idle Timeout**: Enforced at the gateway layer.
- **Concurrent Session Policy**: Limits the number of active devices per identity.
- **Refresh Token Rotation**: Issued tokens are single-use; a new refresh token is issued upon consumption.
- **Device Binding**: Sessions are cryptographically bound to the initiating device (e.g., using DPoP).
