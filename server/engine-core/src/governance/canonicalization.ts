import * as crypto from 'crypto';

export class CanonicalPolicySerializer {
    public static serialize(policy: any): string {
        if (policy === null || policy === undefined) return '';
        const canonicalObject = CanonicalPolicySerializer.canonicalize(policy);
        return JSON.stringify(canonicalObject);
    }

    public static hash(policy: any): string {
        const serialized = CanonicalPolicySerializer.serialize(policy);
        return crypto.createHash('sha256').update(serialized).digest('hex');
    }

    private static canonicalize(obj: any): any {
        if (Array.isArray(obj)) {
            const mapped = obj.map(item => CanonicalPolicySerializer.canonicalize(item));
            return mapped.sort((a, b) => {
                const jsonA = JSON.stringify(a);
                const jsonB = JSON.stringify(b);
                return jsonA.localeCompare(jsonB);
            });
        } else if (obj !== null && typeof obj === 'object') {
            const sortedKeys = Object.keys(obj).sort();
            const result: any = {};
            for (const key of sortedKeys) {
                result[key] = CanonicalPolicySerializer.canonicalize(obj[key]);
            }
            return result;
        }
        return obj;
    }
}
