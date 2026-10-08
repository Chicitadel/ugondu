import { Logger } from '../../../../shared/logger';

describe('Credential Redaction Security', () => {
    it('must redact passwords and tokens from execution logs', () => {
        const sensitiveContext = {
            request: {
                username: 'admin',
                password: 'MySecretPassword123!',
                auth_token: 'abc-def-ghi'
            },
            metadata: {
                target: 'AWS',
                secretKey: 'AKIA...SECRET'
            }
        };

        const originalConsoleLog = console.log;
        let interceptedLog = '';
        console.log = (msg: string) => {
            interceptedLog = msg;
        };

        try {
            Logger.info('Authenticating to provider', sensitiveContext);
        } finally {
            console.log = originalConsoleLog;
        }

        expect(interceptedLog).toContain('[REDACTED]');
        expect(interceptedLog).not.toContain('MySecretPassword123!');
        expect(interceptedLog).not.toContain('abc-def-ghi');
        expect(interceptedLog).not.toContain('AKIA...SECRET');
        expect(interceptedLog).toContain('admin'); // Non-sensitive fields should remain
    });
});
