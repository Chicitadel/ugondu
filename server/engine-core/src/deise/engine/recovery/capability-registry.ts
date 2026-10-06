import { ZddTopologyRepair } from '../../../../plugins/recovery-zdd/src/zdd-topology-repair';
import { FrontendValidation } from '../../../../plugins/recovery-http/src/frontend-validation';
import { EnvConfigurationInjection } from '../../../../plugins/recovery-config/src/env-configuration-injection';
import { AutonomousCodePatching } from '../../../../plugins/recovery-code/src/autonomous-code-patching';
import { PathRepositoryReconstruction } from '../../../../plugins/recovery-dependencies/src/path-repository-reconstruction';
import { LiveDatabaseStateReconstruction } from '../../../../plugins/recovery-database/src/live-database-state-reconstruction';
import { MultiRegionFailoverOrchestration } from '../../../../plugins/recovery-network/src/multi-region-failover-orchestration';

import { ComposerIntegrityValidation } from '../../../../plugins/recovery-dependencies/src/composer-integrity-validation';

export class CapabilityRegistry {
    private plugins: Map<string, any> = new Map();

    constructor() {
        // Register Decoupled Plugins
        this.plugins.set('ZddTopologyRepair', new ZddTopologyRepair());
        this.plugins.set('FrontendValidation', new FrontendValidation());
        this.plugins.set('EnvConfigurationInjection', new EnvConfigurationInjection());
        this.plugins.set('AutonomousCodePatching', new AutonomousCodePatching());
        this.plugins.set('PathRepositoryReconstruction', new PathRepositoryReconstruction());
        this.plugins.set('LiveDatabaseStateReconstruction', new LiveDatabaseStateReconstruction());
        this.plugins.set('MultiRegionFailoverOrchestration', new MultiRegionFailoverOrchestration());
        this.plugins.set('ComposerIntegrityValidation', new ComposerIntegrityValidation());
    }

    getCapability(id: string): any {
        return this.plugins.get(id);
    }
}

export const GlobalCapabilityRegistry = new CapabilityRegistry();

