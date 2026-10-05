import { AwsIdentityBootstrap } from '../aws-identity-bootstrap';

describe('AwsIdentityBootstrap', () => {
    let bootstrap: AwsIdentityBootstrap;

    beforeEach(() => {
        bootstrap = new AwsIdentityBootstrap();
    });

    it('should parse standard AWS CSV credentials regardless of column order', () => {
        const standardCsv = `User Name,Access key ID,Secret access key\nugondu-test,AKIAIOSFODNN7EXAMPLE,wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`;
        const creds = bootstrap.parseCredentialsCsv(standardCsv);
        expect(creds.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
        expect(creds.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should parse inverted AWS CSV credentials', () => {
        const invertedCsv = `Secret access key,Access key ID,User Name\nwJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY,AKIAIOSFODNN7EXAMPLE,ugondu-test`;
        const creds = bootstrap.parseCredentialsCsv(invertedCsv);
        expect(creds.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
        expect(creds.secretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should reject malformed CSVs without leaking data', () => {
        const malformedCsv = `Missing,Columns\nValue1,Value2`;
        expect(() => bootstrap.parseCredentialsCsv(malformedCsv)).toThrow(/CSV must contain/);
    });

    it('should generate a safe least-privilege policy', () => {
        const policy: any = bootstrap.generatePolicy(['vpc', 'ec2'], 'eu-west-3');
        expect(policy.Statement.length).toBe(3); // Preflight + vpc + ec2
        
        const hasAdmin = policy.Statement.some((s: any) => s.Action.includes('*'));
        expect(hasAdmin).toBe(false);
    });
});
