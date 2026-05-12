/**
 * Shared utilities for normalizing athlete/school names when matching to
 * filesystem resources (headshot images, logo files, etc.).
 *
 * The headshot naming convention is:  School_FirstName_LastName.ext
 * Special characters in any of those parts can prevent a match when the
 * database value and the actual filename disagree on encoding.
 */

/**
 * Strip diacritical marks (accents) so that e.g. "José" → "Jose",
 * "François" → "Francois", "Müller" → "Muller".
 *
 * Uses Unicode NFD decomposition which separates base letters from
 * combining marks, then removes the marks.
 */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize a name part (school, first, or last) into a filesystem-safe
 * and comparison-safe string:
 *
 *  1. Strip diacritics    ("José" → "Jose")
 *  2. Replace apostrophes / curly quotes with nothing ("O'Brien" → "OBrien")
 *  3. Remove periods       ("St. Mary" → "St Mary")
 *  4. Collapse whitespace to a single underscore
 *  5. Remove any remaining characters that are not alphanumeric, hyphen, or underscore
 *  6. Trim leading/trailing underscores
 */
export function normalizeForFilename(s: string): string {
  let out = stripDiacritics(String(s || ''));
  // Remove apostrophes (straight and curly)
  out = out.replace(/[''`ʼ]/g, '');
  // Remove periods
  out = out.replace(/\./g, '');
  // Replace whitespace runs with underscore
  out = out.replace(/\s+/g, '_');
  // Keep only word chars (letters, digits, underscore) and hyphens
  out = out.replace(/[^\w-]/g, '');
  // Collapse consecutive underscores
  out = out.replace(/_+/g, '_');
  // Trim leading/trailing underscores
  out = out.replace(/^_+|_+$/g, '');
  return out;
}

/**
 * Build all plausible base filenames for a headshot image.
 *
 * Returns a de-duplicated array ordered from most-specific to least-specific:
 *  - Fully normalized:  "StMarys_Jose_OBrien"
 *  - Underscored spaces: "St_Marys_Jose_OBrien"  (if different from above)
 *  - Raw (trimmed):      "St. Mary's_José_O'Brien"
 *
 * Callers should compare case-insensitively.
 */
export function headshotBaseNames(
  school: string,
  firstName: string,
  lastName: string,
): string[] {
  const norm = (s: string) => normalizeForFilename(s);
  const raw = (s: string) => String(s || '').trim();
  const underscoreSpaces = (s: string) => raw(s).replace(/\s+/g, '_');

  const bases = new Set<string>();

  // Fully normalized
  const fn = `${norm(school)}_${norm(firstName)}_${norm(lastName)}`;
  if (fn.replace(/_/g, '')) bases.add(fn);

  // Underscored spaces (preserves apostrophes/periods but unifies whitespace)
  const us = `${underscoreSpaces(school)}_${underscoreSpaces(firstName)}_${underscoreSpaces(lastName)}`;
  if (us.replace(/_/g, '')) bases.add(us);

  // Raw as-is
  const rw = `${raw(school)}_${raw(firstName)}_${raw(lastName)}`;
  if (rw.replace(/_/g, '')) bases.add(rw);

  return Array.from(bases);
}

/**
 * Normalize a string for use as a lookup map key.
 * Strips diacritics, lowercases, removes apostrophes and periods, trims.
 */
export function normalizeLookupKey(s: string): string {
  return stripDiacritics(String(s || ''))
    .toLowerCase()
    .replace(/[''`ʼ.]/g, '')
    .trim();
}
