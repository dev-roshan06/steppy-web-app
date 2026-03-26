/**
 * Splits a string into lowercase alphanumeric tokens, stripping quotes and Cucumber placeholders.
 * Used to prepare both the search query and step expressions for comparison.
 */
export function tokenize(str: string): string[] {
	return str.toLowerCase()
		.replace(/[{}'"]/g, "")
		.split(/[^a-z0-9]+/g)
		.filter(Boolean);
}

/**
 * Computes the Levenshtein edit distance between two strings.
 * Used for fuzzy matching — a distance of ≤ 2 is treated as a probable match.
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
 * Returns true if a candidate step expression is sufficiently different from all existing ones.
 * Used during catalog generation to deduplicate near-identical step variants.
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
