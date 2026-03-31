export interface SteppyFlags {
	json?: boolean;
	"include-steps"?: boolean;
	limit?: string | number;
	threshold?: string | number;
	"min-ratio"?: string | number;
	[key: string]: string | boolean | undefined | number;
}

export interface StepDefinition {
	id: string;
	expression: string;
	pattern: string | RegExp;
	keyword: string;
	source: {
		uri: string;
		line: number;
	};
	metadata: {
		tags: string[];
		roles: string[];
		exampleUsages: string[];
		isTableStep: boolean;
		paramCount: number;
		applicableRoles?: string[];
        applicableKeywords?: string[];
		dataSchemas?: string[][];
	};
	usageCount: number;
}

export interface ScenarioDefinition {
	name: string;
	tags: string[];
	steps: string[];
	source: {
		uri: string;
		line: number;
	};
}

export interface CatalogData {
	meta: {
		generatedAt: string;
		stats: {
			totalSteps: number;
			totalScenarios: number;
			totalUsages: number;
			usedSteps: number;
		};
	};
	parameterTypes: any[];
	steps: StepDefinition[];
	scenarios: ScenarioDefinition[];
}

export interface SearchResult {
	score: number;
	expression?: string;
	name?: string;
	keyword?: string;
	usageCount?: number;
	examples?: string[];
	tags?: string[];
	steps?: string[];
	source: string;
}
