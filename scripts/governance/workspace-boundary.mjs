import path from 'node:path';

/** True only when candidate resolves to directory itself or a descendant. */
export function isPathWithinDirectory(directory, candidate) {
  const resolvedDirectory = path.resolve(directory);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedDirectory, resolvedCandidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
