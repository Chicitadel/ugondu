import fs from 'fs';
import os from 'os';
import path from 'path';
import { PortablePassportStore, PassportStoreError } from './passport-store';

describe('PortablePassportStore shared-writer contract', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-passport-store-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('preserves independent writes made through separate engine instances', () => {
    const firstInstance = new PortablePassportStore(directory);
    const secondInstance = new PortablePassportStore(directory);

    firstInstance.set({ passportId: 'passport-a', tenantId: 'tenant-a' });
    secondInstance.set({ passportId: 'passport-b', tenantId: 'tenant-b' });

    expect(firstInstance.get('passport-a')?.tenantId).toBe('tenant-a');
    expect(firstInstance.get('passport-b')?.tenantId).toBe('tenant-b');
    expect(secondInstance.get('passport-a')?.tenantId).toBe('tenant-a');
    expect(secondInstance.get('passport-b')?.tenantId).toBe('tenant-b');
  });

  it('makes revocation visible to another instance and rejects unknown revocation targets', () => {
    const issuer = new PortablePassportStore(directory);
    const verifier = new PortablePassportStore(directory);
    issuer.set({ passportId: 'passport-c', tenantId: 'tenant-c' });

    issuer.revoke('passport-c', 'SECURITY_REVIEW');

    expect(verifier.isRevoked('passport-c')).toBe(true);
    expect(() => issuer.revoke('not-registered')).toThrow(PassportStoreError);
  });

  it('fails closed when another writer holds the shared lock beyond the bounded wait', () => {
    const store = new PortablePassportStore(directory);
    fs.mkdirSync(path.join(directory, '.passports.write-lock'));

    let caught: unknown;
    try {
      store.set({ passportId: 'passport-d', tenantId: 'tenant-d' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PassportStoreError);
    expect((caught as PassportStoreError).code).toBe('PASSPORT_STORE_UNAVAILABLE');
    expect(store.get('passport-d')).toBeNull();
  });
});
