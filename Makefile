# =============================================================================
# Ugondu Makefile
# Air Roofers Ltd — Ujomor Systems Engineering Authority
# =============================================================================

.PHONY: all build client test docker lint clean

all: build client

build:
	@echo "[en] Building all Node.js microservices..."
	@npm run build --workspaces

client:
	@echo "[en] Compiling Go thin-client..."
	@cd client && go build -ldflags="-s -w" -o ugondu.exe .

test:
	@echo "[en] Running integration tests..."
	@node tests/billing-gateway.test.js
	@node tests/engine-core.test.js
	@node tests/plugin-manager.test.js
	@node tests/repository-adapter.test.js

docker:
	@echo "[en] Building Docker images..."
	@docker compose build

lint:
	@echo "[en] Linting not yet configured for all workspaces"

clean:
	@echo "[en] Cleaning build artifacts..."
	@rm -rf server/*/dist
	@rm -f client/ugondu.exe
	@rm -f client/ugondu
	@echo "[en] Clean complete."
