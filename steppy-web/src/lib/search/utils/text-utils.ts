/**
 * Converts a string into a normalised array of lowercase alphanumeric tokens.
 *
 * Strips curly braces, quotes, and Cucumber parameter placeholders, then splits
 * on any non-alphanumeric character. Used to prepare both the search query and
 * step expressions for token-level comparison.
 *
 * @example
 * tokenize('I click the {string} button')
 * // => ['i', 'click', 'the', 'button']
 *
 * @param str - The raw string to tokenize.
 * @returns Array of clean lowercase tokens with empty strings removed.
 */
export function tokenize(str: string): string[] {
	return str.toLowerCase()
		.replace(/[{}'"]/g, "")
		.split(/[^a-z0-9]+/g)
		.filter(Boolean);
}

/**
 * Computes the Levenshtein (edit) distance between two strings.
 *
 * Used for fuzzy matching: a distance of ≤ 2 is considered a probable match,
 * accounting for typos, plural forms, and minor spelling variations.
 *
 * @example
 * levenshtein('click', 'clik') // => 1
 * levenshtein('navigate', 'naviage') // => 1
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The minimum number of single-character edits (insert, delete, replace)
 *          needed to transform `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	const matrix: number[][] = [];
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}
	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}
	return matrix[b.length][a.length];
}

/**
 * Determines whether a candidate step expression is meaningfully different
 * from a list of already-seen expressions.
 *
 * Two expressions are considered duplicates when they share the same token
 * sequence with at most 1 differing token (for longer steps) or zero differing
 * tokens (for short steps of ≤ 5 words). Steps longer than 150 characters are
 * always rejected to avoid noise.
 *
 * Used during catalog generation to deduplicate near-identical step variants.
 *
 * @param candidate - The new step expression to evaluate.
 * @param existing  - Expressions already accepted into the result set.
 * @returns `true` if the candidate is distinct enough to include, `false` if it
 *          is too similar to an existing entry.
 */
export function isMeaningfullyDistinct(candidate: string, existing: string[]): boolean {
	if (candidate.length > 150) return false;
	const simpleTokenize = (s: string) => s.split(/\s+/).filter(t => t.length > 0);
	const candidateTokens = simpleTokenize(candidate);
	for (const ex of existing) {
		const existingTokens = simpleTokenize(ex);
		if (Math.abs(candidateTokens.length - existingTokens.length) > 2) continue;
		let diffs = 0;
		const len = Math.min(candidateTokens.length, existingTokens.length);
		for (let i = 0; i < len; i++) {
			if (candidateTokens[i] !== existingTokens[i]) diffs++;
		}
		if (len <= 5 && diffs === 0) return false;
		if (len > 5 && diffs <= 1) return false;
	}
	return true;
}
