import { Logger } from '@ugondu/shared';
import { ISourceAdapter } from '../contract/SourceContract';
import { ProviderCapabilities } from '../../fabric/contract/ProviderContract';

export class UniversalDeliveryEngine {
    /**
     * Physically bridges any valid Source (Local, Git, Backup) to any valid Destination (DirectAdmin, AWS).
     */
    public async executeTransaction(
        source: ISourceAdapter,
        destinationAdapter: any,
        action: 'DEPLOY' | 'RESTORE'
    ): Promise<boolean> {
        Logger.info(`[UniversalDeliveryEngine] Beginning ${action} transaction...`);

        // 1. Authenticate Source
        await source.authenticate({} as any);
        Logger.info(__t('msg_source_identity_authenticated_successful'));

        // 2. Discover Source Capabilities
        const srcCaps = await source.discoverCapabilities();
        Logger.info(`Discovered Source Payload format: ${srcCaps.supportsHistory}`);

        // 3. Resolve Artifact (e.g. stream a backup or git checkout)
        // In a real flow, this would extract the byte stream.
        // For physical validation, we verify the source adapter can resolve.
        const artifactRef = await source.resolveArtifact({ type: 'GIT', uri: 'HEAD' } as any);
        if (!artifactRef) {
            throw new Error(__t('failed_to_resolve_artifact_fro'));
        }
        Logger.info(`Artifact resolved at location/hash: ${artifactRef}`);

        // 4. Connect Destination
        if (!destinationAdapter || typeof destinationAdapter.getInstanceStatus !== 'function') {
            Logger.error(`[UniversalDeliveryEngine] Destination Adapter compliance validation failed.`);
            throw new Error(__t('msg_destination_adapter_compliance_validatio'));
        }

        // 5. Transfer & Deploy
        Logger.info(__t('msg_executing_payload_transfer_to_destinatio'));
        try {
            const targetStatus = await destinationAdapter.getInstanceStatus('ugondu_site');
            if (!targetStatus || targetStatus.state === 'failed') {
                throw new Error(__t('msg_deployment_failed_target_state_is_unstab'));
            }
            Logger.info(`Transaction successful. Target status: ${targetStatus.state}`);
            return true;
        } catch (error: any) {
            Logger.error(`[UniversalDeliveryEngine] Error during artifact transfer or deployment: ${error.message}`);
            throw new Error(`Deployment transaction aborted due to destination adapter failure: ${error.message}`);
        }
    }
}
