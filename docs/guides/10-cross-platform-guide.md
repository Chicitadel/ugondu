<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Developer & Operator Documentation (Guide 10)
 * File           : 10-cross-platform-guide.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# 10 — Cross-Platform Guide

## 1. Supported Operating Systems & Architectures

Ugondu's Go thin client (`client/engine/universal_os.go`) and containerized Node.js control plane (`Dockerfile.server`, `Dockerfile.cli`, `.goreleaser.yml`) support deterministic execution across Linux, macOS, and Windows on both `amd64` (`x86_64`) and `arm64` (`aarch64`).

| OS Family | Architectures | Package Channels | Service Manager Integration |
|---|---|---|---|
| **Linux** (Ubuntu, Debian, RHEL, Alpine, Amazon Linux 2023) | `amd64`, `arm64` | `.deb`, `.rpm`, `.tar.gz`, Docker (`ghcr.io/airroofers/ugondu`) | `systemd` (`LinuxPackageRepair`, `BasicRuntimeServiceRepair`) |
| **macOS** (Sonoma / Sequoia+) | `amd64` (Intel), `arm64` (Apple Silicon) | Homebrew (`brew install airroofers/tap/ugondu`), `.tar.gz` | `launchd` (`MacOSServiceRepair`) |
| **Windows** (Windows 11 / Server 2022+) | `amd64`, `arm64` | WinGet, Scoop, `.zip` | Windows SCM (`WindowsServiceRepair`) |

---

## 2. Cross-Platform Abstraction Rules

### 2.1 Universal OS Engine (`client/engine/universal_os.go`)
- Never hardcode `/bin/bash` or POSIX-only flags when running on Windows hosts.
- Use `filepath.Join()` in Go and `path.posix` / `path.resolve()` in Node.js appropriately; normalize Git file map keys to forward slashes (`/`) before computing `fileMap` SHA-256 hashes so recipe signatures remain identical across Windows, macOS, and Linux.
- Symlink operations on Windows (`ATOMIC_SYMLINK_SWAP`) automatically detect Developer Mode / SeCreateSymbolicLinkPrivilege or fall back to directory junctions where permitted by policy.

### 2.2 Container Multi-Arch Builds (`A14`)
Both `Dockerfile.server` and `Dockerfile.cli` use multi-stage builds supporting `linux/amd64` and `linux/arm64`:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.server \
  -t ghcr.io/airroofers/ugondu:1.0.0 .
```

### 2.3 Cross-Compiling the Go Thin Client
```bash
# Linux amd64 & arm64
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-linux-amd64 .
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-linux-arm64 .

# macOS amd64 & arm64
GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-darwin-amd64 .
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-darwin-arm64 .

# Windows amd64 & arm64
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-windows-amd64.exe .
GOOS=windows GOARCH=arm64 CGO_ENABLED=0 go build -C client -ldflags="-s -w" -o ../dist/ugondu-windows-arm64.exe .
```

---

## 3. 12-Locale & RTL Terminal Rendering

Ugondu supports 12 languages across all OS terminals, including Right-to-Left (RTL) scripts (`ar` Arabic) and CJK/Indic scripts (`zh`, `ja`, `ko`, `hi`):
- On Windows PowerShell / Windows Terminal, ensure UTF-8 codepage (`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`) is active.
- Locale detection (`client/i18n/detector.go`) inspects `UGONDU_LOCALE`, `~/.ugondu/locale.json`, `LC_ALL`, `LC_MESSAGES`, and `LANG`, normalizing regional tags (e.g., `fr_FR.UTF-8` -> `fr`).

---

## 4. Exit Codes & Troubleshooting

| Platform Issue | Symptom | Resolution |
|---|---|---|
| CRLF line-ending hash drift on Windows | `fileMap` SHA-256 differs between Windows and Linux | Ensure `.gitattributes` enforces `* text=auto eol=lf` for governed source and manifest files |
| Permission mode `0700` / `0600` on Windows NTFS | `os.Chmod` is a no-op for POSIX bits on Windows | `client/engine/state.go` and `lock.go` handle Windows ACL semantics gracefully |
| `exec format error` in ECS Fargate | Container image built on Apple Silicon (`arm64`) deployed to `X86_64` Fargate task | Build with `--platform linux/amd64` or set `runtimePlatform.cpuArchitecture: ARM64` in the ECS Task Definition |

---

## 5. Clean-Room Cross-Platform Validation Checklist

- [ ] `cd client && go test -v -run TestUniversalOS ./...` passes (`client/engine/universal_os_test.go`).
- [ ] `CGO_ENABLED=0` cross-compilation succeeds for `linux/amd64`, `linux/arm64`, `darwin/amd64`, `darwin/arm64`, and `windows/amd64`.
- [ ] `npx jest tests/language-packs.test.js tests/localization-dropin.test.js` passes across all 12 locales.
