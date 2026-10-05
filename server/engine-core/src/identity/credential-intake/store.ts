import * as keytar from 'keytar';
import { NormalizedCredential } from './core';

const UGONDU_KEYTAR_SERVICE = 'UgonduAWSProvider';

export class UgonduCredentialStore {
    public async save(credential: NormalizedCredential): Promise<void> {
        // We partition by provider so multiple providers can be stored
        const accountId = `ugondu-${credential.provider}-credentials`;
        const payload = JSON.stringify(credential);
        
        await keytar.setPassword(UGONDU_KEYTAR_SERVICE, accountId, payload);
    }

    public async get(provider: string): Promise<NormalizedCredential | null> {
        const accountId = `ugondu-${provider}-credentials`;
        const payload = await keytar.getPassword(UGONDU_KEYTAR_SERVICE, accountId);
        
        if (!payload) return null;
        
        try {
            return JSON.parse(payload) as NormalizedCredential;
        } catch {
            return null;
        }
    }

    public async remove(provider: string): Promise<void> {
        const accountId = `ugondu-${provider}-credentials`;
        await keytar.deletePassword(UGONDU_KEYTAR_SERVICE, accountId);
    }
}
