import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const composePath = new URL("../../docker-compose.yml", import.meta.url);
const compose = fs.readFileSync(composePath, "utf8");

function serviceBlock(name) {
  const marker = `  ${name}:\n`;
  const start = compose.indexOf(marker);
  assert.notEqual(start, -1, `Compose service ${name} exists`);
  const next = compose.indexOf("\n  # ─", start + marker.length);
  const nextService = compose.indexOf("\n  ", start + marker.length);
  const end = next > start ? next : compose.length;
  return compose.slice(start, end);
}

test("billing gateway has internal service discovery and external federation egress", () => {
  const block = serviceBlock("billing-gateway");
  assert.match(block, /networks:\s*\n\s+- ugondu-internal\s*\n\s+- ugondu-external/);
  assert.match(block, /https:\/\/billing\.airroofers\.eu/);
  assert.match(block, /https:\/\/identity\.airroofers\.eu/);
});

test("engine ingress is loopback-only and aligned to the EC2 bootstrap port", () => {
  const block = serviceBlock("engine-core");
  assert.match(block, /127\.0\.0\.1:\$\{UGONDU_BIND_PORT:-8081\}:4001/);
  assert.doesNotMatch(block, /["'](?:0\.0\.0\.0:|4001:4001)/);
});

test("every service has a bounded memory limit and no fixed container name", () => {
  for (const name of ["billing-gateway", "engine-core", "plugin-manager", "repository-adapter", "event-bus"]) {
    assert.match(serviceBlock(name), /mem_limit:\s*\d+m/, `${name} has a memory bound`);
  }
  assert.doesNotMatch(compose, /^\s*container_name:/m);
});

test("internal-only services remain on the isolated network", () => {
  assert.match(compose, /ugondu-internal:\s*\n\s+driver: bridge\s*\n\s+internal: true/);
  for (const name of ["plugin-manager", "repository-adapter", "event-bus"]) {
    const block = serviceBlock(name);
    assert.match(block, /networks:\s*\n\s+- ugondu-internal/);
    assert.doesNotMatch(block, /ugondu-external/);
  }
});
