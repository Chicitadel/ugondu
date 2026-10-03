const fs = require('fs');
const path = require('path');
const root = 'D:\\ujomor-platform\\products\\ugondu\\server\\';

const edits = [
  // legacy (key, default, arg) calls -> named params
  ['uppie/src/adapters/cpanel/CpanelAdapter.ts', /__t\('(cpanel\.[a-z]+\.err)',\s*'Error: \{0\}',\s*e\.message\)/g, "__t('$1', { message: e.message })"],
  ['uppie/src/adapters/cpanel/CpanelAdapter.ts', /__t\('(cpanel\.[a-z]+\.(?:fail|read|write|unsupported))',\s*'[^']*'\)/g, "__t('$1')"],
  // azure: key + manual concatenation -> single tokenized message
  ['uppie/src/adapters/azure-rbac/AzureRbacAdapter.ts', /`\$\{__t\('(azure\.rbac\.[a-z]+_failed)'\)\}: \$\{error\.message\}`/g, "__t('$1', { message: error.message })"],
  // hardcoded English concatenated onto tokenized messages
  ['uppie/src/core/policy-simulation/PolicySimulationEngine.ts', /(__t\('ui\.responses\.wildcard_resource_scope_is_forbidden',[^)]*\))\s*\+\s*'LeastPrivilegeCompiler must reduce resource scope before simulation\.',/g, '$1,'],
  ['uppie/src/core/policy-simulation/PolicySimulationEngine.ts', /(__t\('ui\.responses\.deny_rule_submitted_to_adapter_which',[^)]*\))\s*\+\s*'does not support simulation\/DENY\. '\s*\+\s*'cPanel and similar providers MUST NOT receive DENY rules\.',/g, '$1,'],
  // hardcoded English passed as parameters
  ['engine-core/src/urre/execution/checkpoint.ts', /error: 'providerStorageEndpoint is not configured for Enterprise\/Sovereign tier',/g, "error: __t('messages.error.checkpoint_storage_endpoint_not_configured'),"],
  ['engine-core/src/urre/execution/kernel.ts', /error: `Unknown action type '\$\{action\.type\}'\. Must be one of: \$\{\[\.\.\.KNOWN_ACTION_TYPES\]\.join\(', '\)\}`,/g, "error: __t('messages.error.unknown_action_type', { actionType: action.type, allowed: [...KNOWN_ACTION_TYPES].join(', ') }),"],
];

for (const [rel, re, rep] of edits) {
  const p = path.join(root, rel);
  const src = fs.readFileSync(p, 'utf8');
  let n = 0;
  const out = src.replace(re, (...a) => { n++; return rep.replace(/\$(\d)/g, (_, i) => a[Number(i)]); });
  if (n) fs.writeFileSync(p, out, 'utf8');
  console.log(`${n}\t${rel}\t${re.source.slice(0, 50)}`);
}
