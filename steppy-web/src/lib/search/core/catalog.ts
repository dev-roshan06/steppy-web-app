import fs from "fs";
import path from "path";
import type { CatalogData } from "../types";

let cachedCatalog: CatalogData | null = null;

/**
 * Loads the Steppy catalog JSON from disk and caches it in memory.
 * The catalog is injected by Jenkins at build time; locally it lives in src/data/.
 */
export function loadCatalog(): CatalogData {
	if (cachedCatalog) return cachedCatalog;
	const filePath = path.join(process.cwd(), "src/data/steppy_catalog.json");
	cachedCatalog = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	return cachedCatalog!;
}
