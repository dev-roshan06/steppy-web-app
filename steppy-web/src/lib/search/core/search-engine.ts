import { StepDefinition, SearchResult, ScenarioDefinition, SteppyFlags } from "../types";
import { tokenize, levenshtein } from "../utils/text-utils";
import { SYNONYMS } from "../utils/synonyms";

export class SearchEngine {
	static searchSteps(q: string, steps: StepDefinition[], flags: SteppyFlags): SearchResult[] {
		const queryTokens = tokenize(q);

		const checkSynonym = (synonyms: string[], stepTokens: string[]) =>
			synonyms.some(syn => stepTokens.some(t => t === syn || t.includes(syn)));

		let finalResults = steps.map((s: any) => {
			let score = 0;
			const text = (s.expression || "").toLowerCase();
			const pattern = (s.pattern || "").toLowerCase();
			const query = q.toLowerCase();

			if (text.includes(query)) score += 20;
			if (pattern.includes(query)) score += 15;

			const stepTokens = tokenize(text);
			let tokenMatches = 0;

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

			if (queryTokens.length > 0) {
				const matchRatio = tokenMatches / queryTokens.length;
				if (matchRatio > 0.75) score += 5;
				if (matchRatio === 1) score += 5;
			}

			if (s.metadata?.exampleUsages) {
				for (const example of s.metadata.exampleUsages) {
					if (example.toLowerCase().includes(query)) {
						score += 8;
						break;
					}
				}
			}

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

	static searchScenarios(q: string, scenarios: ScenarioDefinition[], flags: SteppyFlags): SearchResult[] {
		const includeSteps = flags["include-steps"] === true;
		const queryTokens = tokenize(q);

		const checkSynonym = (synonyms: string[], stepTokens: string[]) =>
			synonyms.some(syn => stepTokens.some(t => t === syn || t.includes(syn)));

		const results = scenarios.map((s: any) => {
			let score = 0;
			const name = (s.name || "").toLowerCase();
			const query = q.toLowerCase();
			const normalizedQuery = query.replace(/[_-]/g, " ");

			if (name.includes(query)) score += 10;
			if (name.includes(normalizedQuery)) score += 8;

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

			if (queryTokens.length > 0) {
				const matchRatio = tokenMatches / queryTokens.length;
				if (matchRatio > 0.75) score += 5;
				if (matchRatio === 1) score += 5;
			}

			if (s.tags?.some((t: string) => {
				const lowT = t.toLowerCase();
				const normT = lowT.replace(/[_-]/g, " ");
				if (lowT.includes(query) || normT.includes(normalizedQuery)) return true;
				if (queryTokens.some(qt => qt.length > 3 && (levenshtein(qt, lowT) <= 2 || levenshtein(qt, normT) <= 2))) return true;
				return false;
			})) score += 5;

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
