/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Universal Delivery Orchestration
 * File           : SourceContract.ts
 * Version        : 3.0.0
 * Author         : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { DeliverySource, DeliveryArtifact } from './DeliveryTransaction';

export interface SourceIdentity {
    sourceId: string;
    authenticityVerified: boolean;
    trustLevel: 'UNTRUSTED' | 'VERIFIED' | 'INTERNAL' | 'SOVEREIGN';
}

export interface SourceCapabilities {
    supportsHistory: boolean;
    supportsSignatures: boolean;
    supportsAtomicReads: boolean;
}

export interface ISourceAdapter {
    /**
     * Identify and authenticate the physical source entity independent of the actor.
     */
    authenticate(credentialRef: string): Promise<SourceIdentity>;

    /**
     * Discover the capabilities of the remote source.
     */
    discoverCapabilities(): Promise<SourceCapabilities>;

    /**
     * Resolve a specific source reference into a cryptographically digestable artifact.
     */
    resolveArtifact(source: DeliverySource): Promise<DeliveryArtifact>;

    /**
     * Pull/Stream the artifact to the Ugondu temporary execution sandbox.
     */
    fetchPayload(artifact: DeliveryArtifact): Promise<string>; // Returns local sandbox path
}

export interface ISourceFabric {
    getAdapter(adapterName: string): ISourceAdapter;
    registerAdapter(adapterName: string, adapter: ISourceAdapter): void;
}
