import { CanonicalPolicySerializer } from '../canonicalization';

describe('CanonicalPolicySerializer', () => {
    it('should generate identical hashes for equivalent IAM policies with different key orders', () => {
        const policyA = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['s3:GetObject', 's3:ListBucket'],
                    Resource: '*'
                }
            ]
        };

        const policyB = {
            Statement: [
                {
                    Resource: '*',
                    Action: ['s3:GetObject', 's3:ListBucket'],
                    Effect: 'Allow'
                }
            ],
            Version: '2012-10-17'
        };

        const hashA = CanonicalPolicySerializer.hash(policyA);
        const hashB = CanonicalPolicySerializer.hash(policyB);

        expect(hashA).toBe(hashB);
    });

    it('should generate identical hashes for equivalent IAM policies with different array element orders', () => {
        const policyA = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['s3:GetObject', 's3:ListBucket'],
                    Resource: '*'
                }
            ]
        };

        const policyB = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['s3:ListBucket', 's3:GetObject'],
                    Resource: '*'
                }
            ]
        };

        const hashA = CanonicalPolicySerializer.hash(policyA);
        const hashB = CanonicalPolicySerializer.hash(policyB);

        expect(hashA).toBe(hashB);
    });
    
    it('should generate identical hashes for identical arrays of objects in different order', () => {
        const policyA = {
            Version: '2012-10-17',
            Statement: [
                { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
                { Effect: 'Deny', Action: 's3:DeleteObject', Resource: '*' }
            ]
        };

        const policyB = {
            Version: '2012-10-17',
            Statement: [
                { Effect: 'Deny', Action: 's3:DeleteObject', Resource: '*' },
                { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' }
            ]
        };

        const hashA = CanonicalPolicySerializer.hash(policyA);
        const hashB = CanonicalPolicySerializer.hash(policyB);

        expect(hashA).toBe(hashB);
    });

    it('should generate different hashes for differing IAM policies', () => {
        const policyA = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['s3:GetObject'],
                    Resource: '*'
                }
            ]
        };

        const policyB = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['s3:PutObject'],
                    Resource: '*'
                }
            ]
        };

        const hashA = CanonicalPolicySerializer.hash(policyA);
        const hashB = CanonicalPolicySerializer.hash(policyB);

        expect(hashA).not.toBe(hashB);
    });
});
