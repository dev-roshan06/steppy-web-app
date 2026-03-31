import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfiguration, loadSupport } from "@cucumber/cucumber/api";
import { isMeaningfullyDistinct } from "../utils/text-utils";
import { findFiles } from "../utils/fs-utils";
import { CatalogData, StepDefinition } from "../types";
import { ISupportCodeLibrary } from "../types/cucumber-internals";

// --- Configuration ---
const OUTPUT_FILE = "src/data/steppy_catalog.json";
const FEATURE_DIRS = ["src/sample/features", "features"];

const IGNORED_PARAMETER_TYPES = new Set([
	"int", "float", "word", "string", "double",
	"bigdecimal", "byte", "short", "long",
	"biginteger", ""
]);

/**
 * Peeks ahead in the lines array to detect data table headers following a step.
 * Scans up to 5 lines forward to find pipe-delimited table syntax.
 * @param lines - Array of source code lines
 * @param startIdx - Starting line index to search from
 * @returns Array of table column headers, or null if no table found
 */
function getTableHeaders(lines: string[], startIdx: number): string[] | null {
	// Scan forward max 5 lines
	for(let j = startIdx + 1; j < Math.min(lines.length, startIdx + 5); j++) {
		const line = lines[j].trim();
		if(!line || line.startsWith("#")) continue;

		// Stop tokens - if we see these, the step has no table
		if(/^(Given|When|Then|And|But|Scenario:|Background:|Example:|Examples:|@)/.test(line)) return null;

		// Table detected
		if(line.startsWith("|")) {
			// Parse headers: "| col1 | col2 |" -> ["col1", "col2"]
			// Split by pipe, remove empty strings from ends
			return line.split("|").map(c => c.trim()).filter(c => c !== "");
		}

		// If we hit text that isn't a table or a step, stop.
		return null;
	}
	return null;
}

/**
 * Updates step definition usage metrics when a step is matched in a feature file.
 * Increments usage count, collects example usages, tracks applicable keywords, and infers applicable roles.
 * @param stepDef - The step definition to update
 * @param stepText - The actual step text from the feature file
 * @param keyword - The Gherkin keyword used with this step (Given/When/Then/And/But)
 */
function updateStepUsage(stepDef: StepDefinition, stepText: string, keyword: string) {
	stepDef.usageCount++;
	const exampleWithKeyword = `${keyword} ${stepText}`;
	if(!stepDef.metadata.exampleUsages.includes(exampleWithKeyword)) {
		if(stepDef.metadata.exampleUsages.length < 5) { // Example usage is limited to 5 here, could increase later
			if(stepDef.metadata.exampleUsages.length === 0 || isMeaningfullyDistinct(stepText, stepDef.metadata.exampleUsages)) {
				stepDef.metadata.exampleUsages.push(exampleWithKeyword);
			}
		}
	}

	// KEYWORD TRACKING
	stepDef.metadata.applicableKeywords ??= [];
	if(!stepDef.metadata.applicableKeywords.includes(keyword)) {
		stepDef.metadata.applicableKeywords.push(keyword);
	}

	// ROLE INFERENCE
	stepDef.metadata.applicableRoles ??= [];
	if(stepText.includes("brokerName")) {
		if(!stepDef.metadata.applicableRoles.includes("Broker")) {
			stepDef.metadata.applicableRoles.push("Broker");
		}
	}
	if(stepText.includes("carrierName")) {
		if(!stepDef.metadata.applicableRoles.includes("Carrier")) {
			stepDef.metadata.applicableRoles.push("Carrier");
		}
	}
}

/**
 * Extracts custom parameter types from the Cucumber support code library and adds them to the catalog.
 * Filters out built-in parameter types that don't need to be documented.
 * @param library - Loaded Cucumber support code library
 * @param catalog - Catalog object to store parameter types in
 */
function processParameterTypes(library: ISupportCodeLibrary, catalog: CatalogData) {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if(library?.parameterTypeRegistry) {
		library.parameterTypeRegistry.parameterTypes.forEach((p: any) => {
			if(IGNORED_PARAMETER_TYPES.has(p.name)) return;
			catalog.parameterTypes.push({
				name: p.name,
				regexp: p.regexpStrings,
				type: p.type?.name || "custom"
			});
		});
	} else {
		console.error("CRITICAL: parameterTypeRegistry is missing on loaded support code!");
	}
}

/**
 * Processes step definitions from the Cucumber library and populates the catalog.
 * Creates step definition objects with metadata placeholders and stores references for later matching.
 * @param library - Loaded Cucumber support code library
 * @param catalog - Catalog object to add step definitions to
 * @param stepObjMap - Map to store step ID -> internal step object for matching
 */
function processStepDefinitions(library: ISupportCodeLibrary, catalog: CatalogData, stepObjMap: Map<string, any>) {
	console.log(`   Found ${library?.stepDefinitions?.length ?? 0} step definitions.`);

	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if(library?.stepDefinitions) {
		library.stepDefinitions.forEach((s: any) => {
			const expression = s.pattern?.toString() || "";
			// Fix Source Path (make relative to project root)
			// Cucumber returns absolute paths or strange internal URIs
			// Assuming s.uri is available in recent Cucumber versions
			const rawUri = s.uri || s.options?.uri || "";
			let relativeUri = rawUri;
			if(path.isAbsolute(rawUri)) {
				relativeUri = path.relative(process.cwd(), rawUri);
			}

			// Store in catalog
			const stepDef: StepDefinition = {
				id: s.id,
				expression: typeof s.pattern === "string" ? s.pattern : expression,
				pattern: expression,
				keyword: "Unknown", // Will be inferred later
				source: {
					uri: relativeUri,
					line: s.line || 0
				},
				metadata: {
					tags: [],
					roles: [], // inferred later
					exampleUsages: [],
					isTableStep: false,
					paramCount: s.expression?.parameterNames?.length || 0
				},
				usageCount: 0
			};
			catalog.steps.push(stepDef);
			stepObjMap.set(s.id, s);
		});
	}
}

/**
 * Infers tags for a step definition based on its file name and directory structure.
 * Tags help categorize steps for filtering and discovery.
 * @param step - The step definition to infer tags for
 */
function inferTags(step: StepDefinition) {
	const fileName = path.basename(step.source.uri);
	const simpleName = fileName.replace(".steps.ts", "").replace(".ts", "");
	const fileTags = [simpleName];

	const dirName = path.dirname(step.source.uri);
	const dirs = dirName.split(path.sep).filter(d => d !== "steps" && d !== "." && d !== "..");
	step.metadata.tags = Array.from(new Set([...dirs, ...fileTags]));
}

/**
 * Infers the Gherkin keyword (Given/When/Then/And/But/Any) for a step by examining surrounding code.
 * Scans backwards from the step definition line to find the keyword declaration.
 * @param step - The step definition to infer the keyword for
 * @param lines - Array of source code lines
 */
function inferKeyword(step: StepDefinition, lines: string[]) {
	// Line numbers are 1-based in Cucumber, arrays are 0-based
	const lineIndex = step.source.line - 1;
	const validKeywords = ["Given", "When", "Then", "And", "But", "defineStep"];

	// Search a small window (current line and 2 lines above)
	for(let i = 0; i < 3; i++) {
		const idx = lineIndex - i;
		if(idx < 0 || idx >= lines.length) continue;

		const codeLine = lines[idx].trim();
		for(const kw of validKeywords) {
			if(codeLine.startsWith(kw)) {
				step.keyword = kw === "defineStep" ? "Any" : kw;
				return;
			}
		}
	}
}

/**
 * Refines all step metadata by reading their source files and inferring tags and keywords.
 * @param catalog - Catalog containing steps to refine
 */
function inferMetadata(catalog: CatalogData) {
	console.log("   Refining step metadata...");
	for(const step of catalog.steps) {
		const absPath = path.resolve(process.cwd(), step.source.uri);
		if(fs.existsSync(absPath)) {
			const content = fs.readFileSync(absPath, "utf-8");
			const lines = content.split("\n");

			inferTags(step);
			inferKeyword(step, lines);
		}
	}
}

interface FeatureProcessContext {
	currentTags: string[];
	featureTags: string[];
	currentScenario: any;
	pathTags: string[];
	file: string;
	catalog: CatalogData;
	stepObjMap: Map<string, any>;
}

/**
 * Processes a line that starts with @ tags.
 * Extracts tag names and adds them to the current context.
 * @param line - The line to process
 * @param context - Feature processing context
 * @returns True if line was a tag line, false otherwise
 */
function processTagLine(line: string, context: FeatureProcessContext): boolean {
	if(line.startsWith("@")) {
		const tags = line.split(/\s+/).filter(t => t.startsWith("@")).map(t => t.substring(1));
		context.currentTags.push(...tags);
		return true;
	}
	return false;
}

/**
 * Processes the Feature: header line.
 * Extracts feature name and combines it with accumulated tags.
 * @param line - The line to process
 * @param context - Feature processing context
 * @returns True if line was a Feature header, false otherwise
 */
function processHeaderLine(line: string, context: FeatureProcessContext): boolean {
	if(line.startsWith("Feature:")) {
		context.featureTags = [...context.currentTags];
		const featureName = line.replace("Feature:", "").trim();
		if(featureName) {
			// eslint-disable-next-line
			const nameTag = featureName.replace(/[^a-zA-Z0-9]/g, "");
			if(nameTag) context.featureTags.push(nameTag);
		}
		context.currentTags = [];
		return true;
	}
	return false;
}

/**
 * Processes Scenario or Scenario Outline lines.
 * Creates a new scenario object and saves the previous one if it exists.
 * @param line - The line to process
 * @param i - Current line number in the file
 * @param context - Feature processing context
 * @returns True if line was a Scenario header, false otherwise
 */
function processScenarioLine(line: string, i: number, context: FeatureProcessContext): boolean {
	const scenarioMatch = /^(?:Scenario|Scenario Outline):\s*(.*)$/.exec(line);
	if(scenarioMatch != null) {
		if(context.currentScenario) {
			context.catalog.scenarios.push(context.currentScenario);
		}
		context.currentScenario = {
			name: scenarioMatch[1].trim(),
			steps: [],
			tags: Array.from(new Set([...context.pathTags, ...context.featureTags, ...context.currentTags])),
			source: {
				uri: path.relative(process.cwd(), context.file),
				line: i + 1
			}
		};
		context.currentTags = [];
		return true;
	}
	return false;
}

/**
 * Attempts to match a step text against a standard step definition.
 * If matched, updates step usage and captures data table schemas if present.
 * @param stepDef - The step definition to match against
 * @param internalStep - Internal Cucumber step object with matching capabilities
 * @param stepText - The actual step text from the feature file
 * @param keyword - The Gherkin keyword used with this step (Given/When/Then/And/But)
 * @param lines - Array of source code lines for table detection
 * @param lineIndex - Current line index for table lookahead
 * @returns True if match successful, false otherwise
 */
function tryMatchStandard(stepDef: StepDefinition, internalStep: any, stepText: string, keyword: string, lines: string[], lineIndex: number): boolean {
	if(internalStep.matchesStepName(stepText)) {
		updateStepUsage(stepDef, stepText, keyword);
		const headers = getTableHeaders(lines, lineIndex);
		if(headers != null) {
			stepDef.metadata.dataSchemas ??= [];
			const schemaStr = JSON.stringify(headers);
			if(!stepDef.metadata.dataSchemas.some((s: string[]) => JSON.stringify(s) === schemaStr)) {
				stepDef.metadata.dataSchemas.push(headers);
			}
		}
		return true;
	}
	return false;
}

/**
 * Attempts to match a step text against a step definition in a Scenario Outline context.
 * Handles parameterized steps by replacing angle-bracket placeholders with test values.
 * @param stepDef - The step definition to match against
 * @param internalStep - Internal Cucumber step object with matching capabilities
 * @param stepText - The actual step text from the scenario outline (may contain <param> placeholders)
 * @param keyword - The Gherkin keyword used with this step (Given/When/Then/And/But)
 * @returns True if match successful, false otherwise
 */
function tryMatchOutline(stepDef: StepDefinition, internalStep: any, stepText: string, keyword: string): boolean {
	if(stepText.includes("<")) {
		const variants = [
			// eslint-disable-next-line
			stepText.replace(/<[^>]+>/g, "param"),
			// eslint-disable-next-line
			stepText.replace(/<[^>]+>/g, "0")
		];
		for(const variant of variants) {
			if(internalStep.matchesStepName(variant)) {
				updateStepUsage(stepDef, stepText, keyword);
				return true;
			}
		}
	}
	return false;
}

/**
 * Matches a step text against any step definition in the catalog.
 * Tries both standard and scenario outline matching strategies.
 * @param stepText - The actual step text from the feature file
 * @param keyword - The Gherkin keyword used with this step (Given/When/Then/And/But)
 * @param context - Feature processing context containing catalog and step objects
 * @param lines - Array of source code lines for table detection
 * @param lineIndex - Current line index for table lookahead
 * @returns True if a matching step definition was found, false otherwise
 */
function matchStep(stepText: string, keyword: string, context: FeatureProcessContext, lines: string[], lineIndex: number): boolean {
	for(const stepDef of context.catalog.steps) {
		const internalStep = context.stepObjMap.get(stepDef.id);
		if(internalStep && typeof internalStep.matchesStepName === "function") {
			if(tryMatchStandard(stepDef, internalStep, stepText, keyword, lines, lineIndex)) {
				return true;
			}
			if(tryMatchOutline(stepDef, internalStep, stepText, keyword)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Processes a line that contains a step (Given/When/Then/And/But).
 * Adds the step to the current scenario and attempts to match it against definitions.
 * @param line - The line to process
 * @param i - Current line number in the file
 * @param lines - Array of source code lines
 * @param context - Feature processing context
 * @returns 1 if step was matched, 0 otherwise (for usage counting)
 */
function processStepLine(line: string, i: number, lines: string[], context: FeatureProcessContext): number {
	if(line.startsWith("#")) return 0;

	const match = /^(Given|When|Then|And|But)\s+(.*)$/.exec(line);
	if(match != null) {
		const keyword = match[1];
		const stepText = match[2];
		if(context.currentScenario) {
			context.currentScenario.steps.push(line);
		}
		const found = matchStep(stepText, keyword, context, lines, i);
		return found ? 1 : 0;
	}
	return 0;
}

/**
 * Dispatches processing for a single feature file line to appropriate handlers.
 * Routes to tag, header, scenario, or step processors based on line content.
 * @param line - The line to process
 * @param i - Current line number in the file
 * @param lines - Array of source code lines
 * @param context - Feature processing context
 * @returns 1 if a step was matched, 0 otherwise
 */
function processFeatureLine(
	line: string,
	i: number,
	lines: string[],
	context: FeatureProcessContext
): number {
	const trimmed = line.trim();
	if(!trimmed) return 0;

	if(processTagLine(trimmed, context)) return 0;
	if(processHeaderLine(trimmed, context)) return 0;
	if(processScenarioLine(trimmed, i, context)) return 0;

	return processStepLine(trimmed, i, lines, context);
}

/**
 * Processes an entire feature file line by line.
 * Parses tags, features, scenarios, and steps to link them with step definitions.
 * @param file - Path to the feature file
 * @param catalog - Catalog to record scenarios and usage
 * @param stepObjMap - Map of step IDs to internal step objects for matching
 * @returns Total number of steps matched in the file
 */
function processFeatureFile(file: string, catalog: CatalogData, stepObjMap: Map<string, any>): number {
	const content = fs.readFileSync(file, "utf-8");
	const lines = content.split("\n");
	const relativePath = path.relative(process.cwd(), file);
	const dirName = path.dirname(relativePath);
	const fileName = path.basename(file, ".feature");
	const pathTags = dirName.split(path.sep)
		.filter(d => !["features", ".", "..", "features_legacy"].includes(d) && d.length > 0);
	pathTags.push(fileName);

	const context: FeatureProcessContext = {
		currentTags: [],
		featureTags: [],
		currentScenario: null,
		pathTags,
		file,
		catalog,
		stepObjMap
	};

	let fileUsages = 0;
	for(let i = 0; i < lines.length; i++) {
		fileUsages += processFeatureLine(lines[i], i, lines, context);
	}

	if(context.currentScenario) {
		catalog.scenarios.push(context.currentScenario);
	}
	return fileUsages;
}

/**
 * Scans all feature files in configured directories and maps step usage.
 * Processes each feature file to link steps and collect usage statistics.
 * @param catalog - Catalog to populate with scenarios and usage data
 * @param stepObjMap - Map of step IDs to internal step objects for matching
 * @returns Total number of steps matched across all feature files
 */
function scanFeaturesAndMapUsage(catalog: CatalogData, stepObjMap: Map<string, any>): number {
	console.log("   Scanning Feature files for usage stats...");

	const featureFiles: string[] = [];
	for(const dir of FEATURE_DIRS) {
		featureFiles.push(...findFiles(path.join(process.cwd(), dir), ".feature"));
	}
	console.log(`      Found ${featureFiles.length} feature files.`);

	let totalUsages = 0;

	for(const file of featureFiles) {
		totalUsages += processFeatureFile(file, catalog, stepObjMap);
	}
	return totalUsages;
}

/**
 * Main catalog generation function.
* Loads Cucumber step definitions, processes feature files, and generates a JSON catalog
 * containing all steps, scenarios, and usage statistics for the test suite.
 * Writes the resulting catalog to the configured output file.
 * @async
 * @throws {Error} If configuration loading or catalog generation fails
 */
export async function generate() {
	// 1. Initialize Catalog Structure
	const catalog: CatalogData = {
		meta: {
			generatedAt: new Date().toISOString(),
			stats: {
				totalSteps: 0,
				totalScenarios: 0,
				totalUsages: 0,
				usedSteps: 0
			}
		},
		parameterTypes: [],
		steps: [],
		scenarios: []
	};

	// 2. Load Cucumber Support Code (Step Definitions)
	try {
		const { runConfiguration } = await loadConfiguration();
		// Cucumber's loadSupport returns the library directly in some versions, or wrapped in others.
		// Based on debug output, it seems to be returned directly here.
		const loadedSupport = await loadSupport(runConfiguration) as any;

		// Unpack if wrapped (older versions might wrap it, or newer ones, strict check)
		const library: ISupportCodeLibrary = loadedSupport.supportCodeLibrary ? loadedSupport.supportCodeLibrary : loadedSupport;

		processParameterTypes(library, catalog);

		const stepObjMap = new Map(); // ID -> Step Object (for matching usage)
		processStepDefinitions(library, catalog, stepObjMap);

		inferMetadata(catalog);

		catalog.meta.stats.totalSteps = catalog.steps.length;

		const totalUsages = scanFeaturesAndMapUsage(catalog, stepObjMap);

		catalog.meta.stats.totalUsages = totalUsages;
		catalog.meta.stats.usedSteps = catalog.steps.filter(s => s.usageCount > 0).length;
		catalog.meta.stats.totalScenarios = catalog.scenarios.length;
		console.log(`      Linked ${totalUsages} usages across features.`);
		console.log(`      Cataloged ${catalog.scenarios.length} scenarios.`);

		// 5. Output JSON
		const absPath = path.join(process.cwd(), OUTPUT_FILE);
		console.log(`   Writing to ${absPath}...`);
		fs.writeFileSync(absPath, JSON.stringify(catalog, null, 2));

		console.log("✅ Done.");
	} catch (e) {
		console.error("GENERATION FAILED:", e);
		throw e;
	}
}
