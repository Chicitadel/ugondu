import { UniversalDeliveryEngine } from '../../delivery/execution/UniversalDeliveryEngine';
import { ISourceAdapter, SourceCapabilities } from '../../delivery/contract/SourceContract';
import { DirectAdminNativeClient } from '../../fabric/providers/directadmin-native-client';
import { DirectAdminAdapter } from '../../fabric/providers/directadmin';

describe('Gate E: Source/Destination Universalism', () => {
    let engine: UniversalDeliveryEngine;
    
    beforeEach(() => {
        engine = new UniversalDeliveryEngine();
    });

    it('can dynamically bridge a Backup source to a DirectAdmin destination', async () => {
        // 1. Physical mock of a Backup Source Adapter
        const backupSource: ISourceAdapter = {
            
            authenticate: jest.fn().mockResolvedValue(undefined),
            discoverCapabilities: jest.fn().mockResolvedValue({
                supportsHistory: false, supportsSignatures: false, supportsAtomicReads: false,
                supportsDelta: false
            } as SourceCapabilities),
            resolveArtifact: jest.fn().mockResolvedValue('backup-2026-10-04.tar.gz'),
            // streamPayload: jest.fn(),
            disconnect: jest.fn()
        };

        // 2. The Native Destination Adapter (No mocks in the adapter itself)
        const mockSshClient = {
            connect: jest.fn().mockResolvedValue(true),
            execCommand: jest.fn().mockResolvedValue({ code: 0, stdout: 'OK', stderr: '' }),
            dispose: jest.fn(),
        };
        const nativeClient = new DirectAdminNativeClient('127.0.0.1', 22, 'admin', 'key');
        (nativeClient as any).ssh = mockSshClient; // Inject the mock SSH transport
        
        const destination = new DirectAdminAdapter(nativeClient);

        // 3. Execute the Universal Transaction
        const result = await engine.executeTransaction(backupSource, destination, 'RESTORE');

        expect(result).toBe(true);
        expect(backupSource.authenticate).toHaveBeenCalled();
        expect(backupSource.resolveArtifact).toHaveBeenCalledWith(expect.any(Object));
        
        // Ensure the Native SSH adapter was physically invoked by the destination adapter!
        expect(mockSshClient.execCommand).toHaveBeenCalledWith(
            expect.stringContaining("if [ -d /home/'admin'/domains/'ugondu_site'/public_html ]; then echo \"OK\"; else echo \"MISSING\"; fi")
        );
    });
});
