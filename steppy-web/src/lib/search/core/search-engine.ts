import { StepDefinition, SearchResult, ScenarioDefinition, SteppyFlags } from "../types";
import { tokenize, levenshtein } from "../utils/text-utils";
import { SYNONYMS } from "../utils/synonyms";

/**
 * Core search engine for querying the Steppy BDD catalog.
 * Provides fuzzy, synonym-aware matching for both step definitions and scenarios.
 */
export class SearchEngine {

	/**
	 * Searches Cucumber step definitions against a free-text query.
	 *
	 * Scoring breakdown (higher = better match):
	 *  - Exact phrase match in expression text  → +20 pts
	 *  - Exact phrase match in step pattern     → +15 pts
	 *  - Direct token match                     → +2 pts per token
	 *  - Synonym match (via SYNONYMS map)        → +1.5 pts per token
	 *  - Fuzzy match (Levenshtein ≤ 2 edits)    → +1 pt per token
	 *  - >75% of query tokens matched           → +5 pts bonus
	 *  - 100% of query tokens matched           → +5 pts bonus
	 *  - Match found in example usages          → +8 pts
	 *  - Usage count boost (capped at 5)        → up to +5 pts
	 *
	 * After scoring, results are filtered dynamically: if the top score exceeds 10,
	 * only results scoring ≥ 30% of the top score are kept (configurable via `min-ratio`).
	 *
	 * @param q     - The free-text search query entered by the user.
	 * @param steps - Array of step definitions from the loaded catalog.
	 * @param flags - Search options: `limit` (max results), `threshold` (min score), `min-ratio` (dynamic cutoff).
	 * @returns Sorted array of matching SearchResult objects, highest score first.
	 */
	static searchSteps(q: string, steps: StepDefinition[], flags: SteppyFlags): SearchResult[] {
		const queryTokens = tokenize(q);

		/**
		 * Checks whether any synonym of a query token matches a token in the step text.
		 * @param synonyms  - List of synonyms for the query token.
		 * @param stepTokens - Tokenized step expression to search within.
		 */
		const checkSynonym = (synonyms: string[], stepTokens: string[]) =>
			synonyms.some(syn => stepTokens.some(t => t === syn || t.includes(syn)));

		let finalResults = steps.map((s: any) => {
			let score = 0;
			const text = (s.expression || "").toLowerCase();
			const pattern = (s.pattern || "").toLowerCase();
			const query = q.toLowerCase();

			// Phrase-level matching — highest signal
			if (text.includes(query)) score += 20;
			if (pattern.includes(query)) score += 15;

			const stepTokens = tokenize(text);
			let tokenMatches = 0;

			// Token-level matching with synonym and fuzzy fallback
			queryTokens.forEach(qToken => {
				if (stepTokens.includes(qToken)) {
					tokenMatches++;
					score += 2;
					return;
				}
				if (SYNONYMS[qToken] != null) {
					if (checkSynonym(SYNONYMS[qToken]!, stepTokens)) {
						tokenMatches++;
						score += 1.5;
						return;
					}
				}
				if (qToken.length > 3) {
					const fuzzyMatch = stepTokens.some(t => t.length >= 3 && levenshtein(qToken, t) <= 2);
					if (fuzzyMatch) {
						tokenMatches++;
						score += 1;
					}
				}
			});

			// Bonus for high overall match ratio
			if (queryTokens.length > 0) {
				const matchRatio = tokenMatches / queryTokens.length;
				if (matchRatio > 0.75) score += 5;
				if (matchRatio === 1) score += 5;
			}

			// Boost if query appears in a real usage example
			if (s.metadata?.exampleUsages) {
				for (const example of s.metadata.exampleUsages) {
					if (example.toLowerCase().includes(query)) {
						score += 8;
						break;
					}
				}
			}

			// Boost popular steps slightly
			if (score > 0 && s.usageCount > 0) {
				score += Math.min(s.usageCount, 5);
			}

			return {
				score,
				expression: s.expression,
				usageCount: s.usageCount,
				examples: s.metadata?.exampleUsages,
				source: `${s.source.uri}:${s.source.line}`,
			};
		}).filter((r: any) => r.score > 0)
			.sort((a: any, b: any) => b.score - a.score);

		const limit = Number(flags.limit) || 10;
		const threshold = Number(flags.threshold) || 0;

		// Dynamic cutoff: drop weak results when a strong match exists
		if (finalResults.length > 0) {
			const topScore = finalResults[0].score;
			if (topScore > 10) {
				const ratio = Number(flags["min-ratio"]) || 0.3;
				finalResults = finalResults.filter((r: any) => r.score >= topScore * ratio || r.score > 8);
			}
		}

		if (threshold > 0) {
			finalResults = finalResults.filter((r: any) => r.score >= threshold);
		}

		return finalResults.slice(0, limit);
	}

	/**
	 * Searches BDD scenarios by name and tags against a free-text query.
	 *
	 * Scoring breakdown:
	 *  - Exact phrase in scenario name               → +10 pts
	 *  - Normalised phrase match (underscores → spaces) → +8 pts
	 *  - Direct token match in name or tags          → +2 pts per token
	 *  - Synonym match                               → +1.5 pts per token
	 *  - Fuzzy match (Levenshtein ≤ 2)               → +1 pt per token
	 *  - >75% / 100% query token coverage            → +5 / +5 pts bonus
	 *  - Tag phrase/fuzzy match                      → +5 pts
	 *  - Step text match (when include-steps is on)  → +3 pts
	 *
	 * @param q         - The free-text search query entered by the user.
	 * @param scenarios - Array of scenario definitions from the loaded catalog.
	 * @param flags     - Search options: `limit`, `threshold`, `min-ratio`, `include-steps`.
	 * @returns Sorted array of matching SearchResult objects, highest score first.
	 */
	static searchScenarios(q: string, scenarios: ScenarioDefinition[], flags: SteppyFlags): SearchResult[] {
		const includeSteps = flags["include-steps"] === true;
		const queryTokens = tokenize(q);

		/**
		 * Checks whether any synonym of a query token matches a token in the scenario tokens.
		 */
		const checkSynonym = (synonyms: string[], stepTokens: string[]) =>
			synonyms.some(syn => stepTokens.some(t => t === syn || t.includes(syn)));

		const results = scenarios.map((s: any) => {
			let score = 0;
			const name = (s.name || "").toLowerCase();
			const query = q.toLowerCase();
			const normalizedQuery = query.replace(/[_-]/g, " ");

			// Phrase-level name matching
			if (name.includes(query)) score += 10;
			if (name.includes(normalizedQuery)) score += 8;

			// Combine name tokens and tag tokens for token-level matching
			const nameTokens = tokenize(name);
			const tagTokens = (s.tags || []).flatMap((t: string) =>
				tokenize(t.toLowerCase().replace(/[_-]/g, " "))
			);
			const allTokens = Array.from(new Set([...nameTokens, ...tagTokens]));

			let tokenMatches = 0;
			queryTokens.forEach(qToken => {
				if (allTokens.includes(qToken)) {
					tokenMatches++;
					score += 2;
					return;
				}
				if (SYNONYMS[qToken] != null) {
					if (checkSynonym(SYNONYMS[qToken]!, allTokens)) {
						tokenMatches++;
						score += 1.5;
						return;
					}
				}
				if (qToken.length > 3 && allTokens.some(t => levenshtein(qToken, t) <= 2)) {
					tokenMatches++;
					score += 1;
				}
			});

			// Bonus for high overall match ratio
			if (queryTokens.length > 0) {
				const matchRatio = tokenMatches / queryTokens.length;
				if (matchRatio > 0.75) score += 5;
				if (matchRatio === 1) score += 5;
			}

			// Extra boost for tag-level phrase or fuzzy match
			if (s.tags?.some((t: string) => {
				const lowT = t.toLowerCase();
				const normT = lowT.replace(/[_-]/g, " ");
				if (lowT.includes(query) || normT.includes(normalizedQuery)) return true;
				if (queryTokens.some(qt => qt.length > 3 && (levenshtein(qt, lowT) <= 2 || levenshtein(qt, normT) <= 2))) return true;
				return false;
			})) score += 5;

			// Optional deep search inside the scenario's step text
			if (includeSteps) {
				const stepsText = s.steps.map((st: string) => st.toLowerCase()).join(" ");
				if (stepsText.includes(query)) score += 3;
			}

			return {
				score,
				name: s.name,
				tags: s.tags,
				steps: includeSteps ? s.steps : undefined,
				source: `${s.source.uri}:${s.source.line}`,
			};
		}).filter((r: any) => r.score > 0)
			.sort((a: any, b: any) => b.score - a.score)
			.slice(0, 10);

		const limit = Number(flags.limit) || 10;
		const threshold = Number(flags.threshold) || 0;

		let filteredResults = results;

		// Dynamic cutoff: drop weak results when a strong match exists
		if (results.length > 0) {
			const topScore = results[0].score;
			if (topScore > 10) {
				const ratio = Number(flags["min-ratio"]) || 0.3;
				filteredResults = filteredResults.filter((r: any) => r.score >= topScore * ratio || r.score > 8);
			}
		}

		if (threshold > 0) {
			filteredResults = filteredResults.filter((r: any) => r.score >= threshold);
		}

		return filteredResults.slice(0, limit);
	}
}
