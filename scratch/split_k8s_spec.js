const fs = require('fs');
const root = 'D:\\ujomor-platform\\products\\ugondu\\server\\uppie\\src\\tests\\';
const specPath = root + 'k8s-rbac.spec.ts';
const lines = fs.readFileSync(specPath, 'utf8').split(/\r?\n/);
const s = lines.findIndex((l) => l.startsWith('/** In-memory cluster'));
const e = lines.findIndex((l) => l.startsWith('function setup()'));
const block = lines.slice(s, e).join('\n').replace('function fakeCluster()', 'export function fakeCluster()');
const header = `/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Kubernetes RBAC Test Support
 * File           : k8sFakeCluster.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { K8sApiError } from '../../adapters/kubernetes-rbac/KubernetesRbacClient';
import type { K8sRbacClient, K8sClusterRole, K8sClusterRoleBinding } from '../../adapters/kubernetes-rbac/KubernetesRbacClient';

`;
fs.mkdirSync(root + 'support', { recursive: true });
fs.writeFileSync(root + 'support\\k8sFakeCluster.ts', header + block.trimEnd() + '\n', 'utf8');
const rest = lines.slice(0, s).concat(lines.slice(e)).join('\n')
  .replace("import { K8sApiError } from '../adapters/kubernetes-rbac/KubernetesRbacClient';\nimport type { K8sRbacClient, K8sClusterRole, K8sClusterRoleBinding } from '../adapters/kubernetes-rbac/KubernetesRbacClient';",
    "import { K8sApiError } from '../adapters/kubernetes-rbac/KubernetesRbacClient';\nimport type { K8sClusterRole } from '../adapters/kubernetes-rbac/KubernetesRbacClient';\nimport { fakeCluster } from './support/k8sFakeCluster';");
fs.writeFileSync(specPath, rest, 'utf8');
console.log('spec lines', rest.split('\n').length);
