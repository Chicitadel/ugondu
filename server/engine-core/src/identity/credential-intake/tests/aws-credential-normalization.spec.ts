import { AwsCredentialNormalizer } from '../providers/aws/aws-normalization';
import * as stsMock from '@aws-sdk/client-sts';

// Mock the AWS SDK to simulate GetCallerIdentity
jest.mock('@aws-sdk/client-sts');

describe('AwsCredentialNormalizer', () => {
    let normalizer: AwsCredentialNormalizer;

    beforeEach(() => {
        normalizer = new AwsCredentialNormalizer();
        jest.clearAllMocks();
    });

    it(__t('should_normalize_a_standard_3_'), async () => {
        const csv = 'User Name,Access key ID,Secret access key\nugondu-user,AKIA123,SECRET456';
        const result = await normalizer.normalize(csv);
        
        expect(result.payload.userName).toBe('ugondu-user');
        expect(result.payload.accessKeyId).toBe('AKIA123');
        expect(result.payload.secretAccessKey).toBe('SECRET456');
    });

    it(__t('should_securely_recover_missin'), async () => {
        const csv = 'Access key ID,Secret access key\nAKIA123,SECRET456';
        
        // Mock successful STS GetCallerIdentity for an IAM user
        (stsMock.STSClient.prototype.send as jest.Mock).mockResolvedValueOnce({
            Account: '123456789012',
            Arn: 'arn:aws:iam::123456789012:user/RecoveredUser',
            UserId: 'AIDA123456789'
        });

        const result = await normalizer.normalize(csv);
        
        expect(result.payload.userName).toBe('RecoveredUser');
        expect(result.payload.accessKeyId).toBe('AKIA123');
        expect(result.payload.secretAccessKey).toBe('SECRET456');
    });

    it(__t('should_fail_normalization_if_s'), async () => {
        const csv = 'Access key ID,Secret access key\nAKIA123,BADSECRET';
        
        // Mock failed STS GetCallerIdentity
        (stsMock.STSClient.prototype.send as jest.Mock).mockRejectedValueOnce(new Error('SignatureDoesNotMatch'));

        await expect(normalizer.normalize(csv)).rejects.toThrow(/Normalization blocked: Missing User Name and credentials failed STS authentication/);
    });

    it(__t('should_fail_normalization_if_a'), async () => {
        const csv = 'Access key ID,Secret access key\nAKIA123,SECRET456';
        
        // Mock assumed role STS GetCallerIdentity
        (stsMock.STSClient.prototype.send as jest.Mock).mockResolvedValueOnce({
            Account: '123456789012',
            Arn: 'arn:aws:sts::123456789012:assumed-role/MyRole/Session',
            UserId: 'AROA123456789:Session'
        });

        await expect(normalizer.normalize(csv)).rejects.toThrow(/Normalization blocked: Identity authenticated but is not a standard IAM User/);
    });
});
