# Ugondu Distribution & Marketplace Architecture
**Classification:** ENTERPRISE | PUBLIC ARCHITECTURE
**Version:** 1.0.0

## 1. Core Principles
1. **Thin Client Exclusivity:** Marketplace and CLI distributions contain **only** the compiled thin client (e.g., the Go CLI). Absolutely no server proprietary code, logic, or private capabilities are embedded in distributed binaries.
2. **Canonical Release Pipeline:** A single verifiable artifact flows from source to all destinations. We do not maintain bespoke forks for different marketplaces.
3. **Edition Architecture Preserved:** The downloaded client is universal. A user upgrades from Free to Enterprise via authentication and licensing. The client queries the server for its capability entitlements and adapts its UI/UX accordingly.
4. **Trusted Provenance:** All distributions are cryptographically signed, accompanied by an SBOM, and automatically verified against release integrity gates.

## 2. One Canonical Release Pipeline

```text
                    Ugondu Source (client/)
                         │
                         ▼
                 Reproducible Build
                         │
                  Signed Artifact (Go binaries)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       CLI repos       Stores       Containers
          │              │              │
      apt/brew/       MS Store/      Docker/OCI
      winget/etc.     Snap/etc.
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 SAME RELEASE
                         │
                         ▼
               Licence / Edition
                 Enforcement (Server-side)
```

## 3. Marketplace Coverage Matrix

*Our pursuit is broad coverage, prioritizing native ecosystem managers to preserve developer ergonomics.*

| Platform/channel   | Install | Update | Signed | Auto-publish | Status             |
| ------------------ | ------- | ------ | ------ | ------------ | ------------------ |
| GitHub Releases    | ✓       | ✓      | ✓      | ✓            | Core               |
| Homebrew           | ✓       | ✓      | ✓      | ✓            | Target             |
| WinGet             | ✓       | ✓      | ✓      | ✓            | Target             |
| Chocolatey         | ✓       | ✓      | ✓      | ✓            | Target             |
| Scoop              | ✓       | ✓      | ✓      | ✓            | Target             |
| Snap               | ✓       | ✓      | ✓      | ✓            | Target             |
| Flatpak            | ✓       | ✓      | ✓      | ✓            | Target             |
| Debian/RPM         | ✓       | ✓      | ✓      | ✓            | Evaluate           |
| Docker/OCI         | ✓       | ✓      | ✓      | ✓            | Target             |
| Cloud marketplaces | ✓       | ✓      | ✓      | ✓            | Evaluate           |
| IDE marketplaces   | —       | —      | ✓      | ✓            | Only if applicable |

## 4. Edition & Capability Degradation
The client must accurately relay server restrictions without crashing.
If a Free user invokes an enterprise capability, the client must catch the 403 / 402 restriction and gracefully format:

```text
Feature unavailable in your current Ugondu edition.

Required capability:
    Multi-Tenant Zero-Loophole Execution

Available in:
    Ugondu Professional
    Ugondu Enterprise

Upgrade / Learn More: https://airroofers.com/ugondu/editions
```
*Fragmentation of binaries per edition is strictly prohibited.*

## 5. Security & Integrity Requirements
Every distributed CLI package traceably guarantees:
- **Signed binaries:** ECDSA / RSA signatures backed by a valid CI release key.
- **SHA-256/SHA-512 integrity hashes:** Provided alongside release manifests.
- **Provenance/Attestation:** Generated via GitHub Actions standard attestations.
- **Vulnerability monitoring:** Base container images and dependencies are continuously audited.
- **Protection against package-name squatting:** Publisher identity must formally map to "Air Roofers Ltd".

## 6. Federated System Host Alignment
In strict accordance with the **Air Roofers Federated Policy Authority Architecture**, the distributed thin client is completely stateless regarding commercial terms and deployment logic. It operates against the centralized federated endpoints:

- **Policy Authority (`policies.airroofers.eu`)**: The client dynamically fetches terms of service, EULAs, and CLI privacy notices from this immutable vault. It never hardcodes policy text.
- **Billing Authority (`billing.airroofers.eu` / AeroBill)**: Handled strictly via browser handoffs and server-to-server callbacks. The CLI opens a browser session for checkout and simply receives a transaction seal (LCR hash).
- **Entitlement Authority (`license.airroofers.eu` / Mandatag)**: The CLI uses token-based authentication against this federated endpoint to receive its cryptographic capability envelope, enforcing the commercial edition dynamically.

This integration ensures that while the physical binaries are decentralized across dozens of global marketplaces (Homebrew, WinGet, Apt, Docker), the **Architectural, Commercial, and Governance truths** remain securely centralized within the Air Roofers EEA-hosted federated systems.
