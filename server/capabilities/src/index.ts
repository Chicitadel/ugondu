/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Public API
 * File           : index.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Classification : ENTERPRISE
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export type { UgonduEdition } from './edition-registry/EditionDefinition';
export {
  UGONDU_EDITIONS,
  EDITION_RANK,
  EDITION_LIMITS,
  meetsEditionRequirement,
  parseEdition,
} from './edition-registry/EditionDefinition';

export type {
  CapabilityClass,
  CapabilityState,
  DeactivationMode,
  CapabilityDefinition,
} from './capability-registry/CapabilityDefinition';
export { CORE_CAPABILITY_IDS, isCoreCapability } from './capability-registry/CapabilityDefinition';

export type { CapabilityManifest } from './entitlement-resolver/CapabilityManifest';
export {
  CapabilityManifestSchema,
  isManifestExpired,
  isEntitled,
} from './entitlement-resolver/CapabilityManifest';

export type { FeatureResolutionResult, FeatureResolution } from './entitlement-resolver/EntitlementResolver';
export { EntitlementResolver } from './entitlement-resolver/EntitlementResolver';

export { CapabilityStateMachine } from './capability-lifecycle/CapabilityStateMachine';

// Capability Dependency Graph
export { CapabilityDependencyGraph } from './capability-dependency-graph/CapabilityDependencyGraph';
export type { DeactivationValidationResult, DeactivationReport } from './capability-dependency-graph/CapabilityDependencyGraph';
