'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const localeVerifiers = [
  ['D25', 'ar'], ['D26', 'de'], ['D27', 'es'], ['D28', 'fr'],
  ['E29', 'it'], ['E30', 'ja'], ['E31', 'pt'], ['E32', 'ru'], ['E33', 'zh'],
].map(([id, locale]) => ({
  id,
  locale,
  verifier: require(`../scripts/cor/streams/${id}`),
}));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-locale-'));
  const dir = path.join(root, 'server', 'shared', 'locales');
  fs.mkdirSync(dir, { recursive: true });
  return { root, dir };
}

function writeJson(dir, name, value) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value), 'utf8');
}

function context(root, streamId) {
  return {
    root,
    streamId,
    executionId: `test-${streamId}`,
    commitSHA: 'a'.repeat(40),
    treeSHA: 'b'.repeat(40),
    startedAt: new Date().toISOString(),
  };
}

for (const { id, locale, verifier } of localeVerifiers) {
  test(`${id} fails closed when the English parity baseline is missing`, async () => {
    const f = fixture();
    try {
      writeJson(f.dir, `${locale}.json`, { greeting: 'translated' });
      await assert.rejects(
        verifier.run(context(f.root, id)),
        new RegExp(`${id}_EN_LOCALE_BASELINE_MISSING`),
      );
    } finally {
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  });

  test(`${id} passes only with a valid English baseline and exact key parity`, async () => {
    const f = fixture();
    try {
      writeJson(f.dir, 'en.json', { greeting: 'hello', farewell: 'goodbye' });
      writeJson(f.dir, `${locale}.json`, { greeting: 'translated', farewell: 'translated' });
      const receipt = await verifier.run(context(f.root, id));
      assert.equal(receipt.status, 'PASS');
      assert.ok(receipt.artifacts.includes(`server/shared/locales/${locale}.json`));
    } finally {
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  });
}

test('locale verifiers reject key drift against the mandatory English baseline', async () => {
  const f = fixture();
  try {
    writeJson(f.dir, 'en.json', { greeting: 'hello', farewell: 'goodbye' });
    writeJson(f.dir, 'ar.json', { greeting: 'translated' });
    await assert.rejects(
      localeVerifiers[0].verifier.run(context(f.root, 'D25')),
      /D25_AR_LOCALE_KEY_PARITY_MISMATCH/,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
