import { ManagementProvenanceRecord } from '../model/provenance';
import { __t } from "@ugondu/shared";

export interface ResourceLifecycleIntent {
    resourceId: string;
    action: 'CREATE' | 'REUSE' | 'RECONCILE' | 'RETIRE';
    expectedState: Record<string, any>;
}

export class ResourceGovernanceEngine {

    /**
     * POL-005 & POL-006: Ensure we only mutate/retire owned resources
     */
    public assessMutationSafety(provenance: ManagementProvenanceRecord, intent: ResourceLifecycleIntent): boolean {
        if (intent.action === 'RETIRE' || intent.action === 'RECONCILE') {
            if (provenance.ownershipState !== 'MANAGED') {
                return false; // POL-006: Unowned destruction blocked
            }
        }
        return true; // Safe to proceed based on ownership
    }

    /**
     * Convergence loop: REUSE -> RECONCILE -> CREATE -> VERIFY -> RETIRE
     */
    public planConvergence(desired: Record<string, any>, observed: Record<string, any> | null, provenance: ManagementProvenanceRecord | null): ResourceLifecycleIntent {
        if (!observed) {
            return { resourceId: 'new', action: 'CREATE', expectedState: desired };
        }

        if (provenance && provenance.ownershipState === 'MANAGED') {
            // Check drift
            const isDrifted = JSON.stringify(desired) !== JSON.stringify(observed);
            if (isDrifted) {
                return { resourceId: provenance.resourceId, action: 'RECONCILE', expectedState: desired };
            }
            return { resourceId: provenance.resourceId, action: 'REUSE', expectedState: desired };
        }

        // Unmanaged but observed? We cannot safely touch it.
        throw new Error(__t('msg_pol_010_violation_reconciliation_safety'));
    }
}
