'use strict';

// Match scripts/validate-locales.js semantics: compare every leaf path, not
// merely root-level keys. Arrays are traversed by numeric index just as the
// existing localization validator traverses enumerable object properties.
function flattenLocaleKeys(value, prefix = '', output = new Set()) {
  if (value === null || typeof value !== 'object') {
    if (prefix) output.add(prefix);
    return output;
  }
  const keys = Object.keys(value);
  if (keys.length === 0 && prefix) output.add(prefix);
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('LOCALE_PROHIBITED_DICTIONARY_KEY');
    }
    const next = prefix ? prefix + '.' + key : key;
    flattenLocaleKeys(value[key], next, output);
  }
  return output;
}

function assertLocaleKeyParity(source, target, streamId, localeCode) {
  const sourceKeys = flattenLocaleKeys(source);
  const targetKeys = flattenLocaleKeys(target);
  const missing = [...sourceKeys].filter((key) => !targetKeys.has(key)).sort();
  const extra = [...targetKeys].filter((key) => !sourceKeys.has(key)).sort();
  if (missing.length || extra.length) {
    const details = [
      missing.length ? 'missing=' + missing.join(',') : '',
      extra.length ? 'extra=' + extra.join(',') : '',
    ].filter(Boolean).join('; ');
    throw new Error(streamId + '_' + localeCode.toUpperCase() + '_LOCALE_KEY_PARITY_MISMATCH: ' + details);
  }
  return sourceKeys.size;
}

module.exports = { flattenLocaleKeys, assertLocaleKeyParity };
