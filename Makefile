# /******************************************************************************
#  * Project        : Ugondu Platform
#  * Module         : Root Build & Governance Automation
#  * File           : Makefile
#  * Version        : 1.1.0
#  * Author         : Ujomor Systems Engineering & Governance Authority
#  * Organization   : Air Roofers Ltd / Ujomor Systems
#  * Created Date   : 2026-10-18
#  * Last Modified  : 2026-10-18
#  * Classification : COMMERCIAL | INTERNAL
#  *
#  * Governance:
#  * - Corporate Policy Governed
#  * - Security Reviewed
#  * - Architecture Controlled
#  * - Protocol Frozen
#  * - Modularization Enforced
#  ******************************************************************************/

.PHONY: all build client test docker lint typecheck governance clean

all: governance build lint typecheck client

build:
	@echo "[en] Building all Node.js microservices and workspaces..."
	@npm run build --workspaces

client:
	@echo "[en] Compiling Go thin-client..."
	@cd client && go vet ./... && go build -ldflags="-s -w" -o ugondu.exe .

lint:
	@echo "[en] Running workspace lint gates and Go static analysis..."
	@npm run lint --workspaces
	@cd client && go vet ./...

typecheck:
	@echo "[en] Running TypeScript strict typecheck across all workspaces..."
	@npm run typecheck --workspaces

governance:
	@echo "[en] Executing policy-as-code and release integrity validators..."
	@npm run governance:validate

test:
	@echo "[en] Running workspace unit tests and integration suites..."
	@npm run test --workspaces
	@npm run test:integration

docker:
	@echo "[en] Building Docker images..."
	@docker compose build

clean:
	@echo "[en] Cleaning build artifacts..."
	@rm -rf server/*/dist
	@rm -f client/ugondu.exe
	@rm -f client/ugondu
	@echo "[en] Clean complete."
