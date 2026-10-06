import { EnvironmentTwin } from '../../../twin/environment-twin';
import { RecoveryScope } from '../live-environment-adapter-contract';

export interface RecoveryCapability {
    /**
     * Unique identifier for the capability (e.g., 'FileRepair', 'ResourceLinkageRepair')
     */
    get capabilityId(): string;

    /**
     * Diagnose the environment twin for specific drift or corruption.
     */
    diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any>;

    /**
     * Generate an exact, non-destructive recovery plan.
     */
    plan(diagnosis: any, scope: RecoveryScope): Promise<any>;

    /**
     * Execute the targeted repair mechanically via the provided adapter.
     */
    execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean>;
}

export interface ResourceLinkageRepair extends RecoveryCapability {
    capabilityId: 'ResourceLinkageRepair';
}

export interface FileRepair extends RecoveryCapability {
    capabilityId: 'FileRepair';
}

export interface PermissionRepair extends RecoveryCapability {
    capabilityId: 'PermissionRepair';
}

export interface ServiceRepair extends RecoveryCapability {
    capabilityId: 'ServiceRepair';
}
