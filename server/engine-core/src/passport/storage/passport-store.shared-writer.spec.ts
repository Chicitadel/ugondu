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
  it('never steals an aged lock while its owning process is still alive', () => {
    const store = new PortablePassportStore(directory);
    const lockPath = path.join(directory, '.passports.write-lock');
    fs.mkdirSync(lockPath);
    fs.writeFileSync(path.join(lockPath, 'owner.json'), JSON.stringify({
      pid: process.pid,
      hostname: require('os').hostname(),
      token: 'live-owner',
      createdAt: Date.now() - 60000,
    }));
    const previousWait = process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
    process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = '20';
    try {
      expect(() => store.set({ passportId: 'passport-live-lock', tenantId: 'tenant-live' }))
        .toThrow(PassportStoreError);
      expect(fs.existsSync(lockPath)).toBe(true);
    } finally {
      if (previousWait === undefined) delete process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
      else process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = previousWait;
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  });

  it('fails closed on an abandoned lock even when its recorded owner is dead', () => {
    const store = new PortablePassportStore(directory);
    const lockPath = path.join(directory, '.passports.write-lock');
    fs.mkdirSync(lockPath);
    fs.writeFileSync(path.join(lockPath, 'owner.json'), JSON.stringify({
      pid: 2147483647,
      hostname: require('os').hostname(),
      token: 'abandoned-owner',
      createdAt: Date.now() - 60000,
    }));
    const previousWait = process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
    process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = '20';
    try {
      expect(() => store.set({ passportId: 'passport-abandoned-lock', tenantId: 'tenant-abandoned' }))
        .toThrow(PassportStoreError);
      expect(fs.existsSync(lockPath)).toBe(true);
    } finally {
      if (previousWait === undefined) delete process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
      else process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = previousWait;
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  });

  it('serializes clear and prevents another instance from resurrecting cleared records', () => {
    const writer = new PortablePassportStore(directory);
    const staleReader = new PortablePassportStore(directory);
    writer.set({ passportId: 'passport-clear', tenantId: 'tenant-clear' });
    writer.clear();
    expect(staleReader.get('passport-clear')).toBeNull();
    expect(fs.existsSync(path.join(directory, 'passports.json'))).toBe(true);
  });

  it('rejects invalid lock timing configuration instead of waiting indefinitely', () => {
    const store = new PortablePassportStore(directory);
    const previousWait = process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
    process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = 'not-a-number';
    try {
      expect(() => store.set({ passportId: 'passport-invalid-config', tenantId: 'tenant-invalid' }))
        .toThrow('Invalid passport lock timing configuration');
    } finally {
      if (previousWait === undefined) delete process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'];
      else process.env['UGONDU_PASSPORT_LOCK_WAIT_MS'] = previousWait;
    }
  });

  it('does not release a lock whose ownership token changed during the critical section', () => {
    const store = new PortablePassportStore(directory);
    const internal = store as unknown as { withWriteLock<T>(operation: () => T): T };
    internal.withWriteLock(() => {
      const ownerPath = path.join(directory, '.passports.write-lock', 'owner.json');
      const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8')) as Record<string, unknown>;
      owner.token = 'replacement-owner';
      fs.writeFileSync(ownerPath, JSON.stringify(owner));
    });
    expect(fs.existsSync(path.join(directory, '.passports.write-lock'))).toBe(true);
    fs.rmSync(path.join(directory, '.passports.write-lock'), { recursive: true, force: true });
  });

  it('fails closed instead of silently dropping malformed persisted passport records', () => {
    fs.writeFileSync(path.join(directory, 'passports.json'), JSON.stringify({
      'passport-key': {
        passportId: 'different-passport-id',
        tenantId: 'tenant-a',
        revoked: 'false',
      },
    }));
    let caught: unknown;
    try {
      new PortablePassportStore(directory);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PassportStoreError);
    expect((caught as PassportStoreError).code).toBe('PASSPORT_STORE_INVALID_DATA');
  });

});
