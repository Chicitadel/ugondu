import fs from 'fs';
import path from 'path';
import os from 'os';
import { JsonLicenseDatabase, resolveLicenseStoreDirectory } from '../db';

describe('Portable persistent license-store contract', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-license-store-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('persists license records atomically and reloads them across store instances', () => {
    const first = new JsonLicenseDatabase(root);
    expect(first.isReady()).toBe(true);

    first.set('token-durable-1', 'tenant-durable', 'professional', {
      entitlements: ['deploy.atomic'],
    });

    const dbPath = path.join(root, 'billing.json');
    expect(fs.existsSync(dbPath)).toBe(true);
    if (process.platform !== 'win32') expect(fs.statSync(dbPath).mode & 0o777).toBe(0o600);

    const second = new JsonLicenseDatabase(root);
    expect(second.isReady()).toBe(true);
    expect(second.get('token-durable-1')).toMatchObject({
      tenant_id: 'tenant-durable',
      edition: 'professional',
      status: 'active',
      entitlements: ['deploy.atomic'],
    });
  });

  it('fails readiness and rejects writes when persisted state is corrupt without overwriting evidence', () => {
    fs.writeFileSync(path.join(root, 'billing.json'), '{not-json', { mode: 0o600 });
    const store = new JsonLicenseDatabase(root);

    expect(store.isReady()).toBe(false);
    expect(store.get('any-token')).toBeNull();
    expect(() => store.set('token-corrupt', 'tenant-x', 'free')).toThrow();
    expect(fs.readFileSync(path.join(root, 'billing.json'), 'utf8')).toBe('{not-json');
  });

  it('does not fall back to memory or another directory when a configured data path is unusable', () => {
    const blocker = path.join(root, 'not-a-directory');
    fs.writeFileSync(blocker, 'reserved');

    expect(() => resolveLicenseStoreDirectory(blocker)).toThrow();
    const store = new JsonLicenseDatabase(blocker);
    expect(store.isReady()).toBe(false);
    expect(() => store.set('token-no-store', 'tenant-x', 'free')).toThrow();
    expect(fs.readFileSync(blocker, 'utf8')).toBe('reserved');
  });

  it('rolls back the in-memory mutation when a persistent write fails', () => {
    const store = new JsonLicenseDatabase(root);
    expect(store.isReady()).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
    fs.writeFileSync(root, 'block-directory-recreation');

    expect(() => store.set('token-write-fail', 'tenant-x', 'free')).toThrow();
    expect(store.isReady()).toBe(false);
    expect(store.get('token-write-fail')).toBeNull();
  });
});
