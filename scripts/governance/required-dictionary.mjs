import fs from 'node:fs';

/**
 * Load a required JSON dictionary and flatten it with the caller-supplied
 * flattener. Missing files and malformed JSON are errors, never empty success.
 */
export function loadRequiredDictionary(filePath, flattenDictionary) {
  if (typeof flattenDictionary !== 'function') {
    throw new TypeError('flattenDictionary must be a function');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required locale dictionary is missing: ${filePath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Required locale dictionary is invalid JSON: ${filePath} (${error.message})`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Required locale dictionary root must be an object: ${filePath}`);
  }
  return flattenDictionary(parsed);
}
