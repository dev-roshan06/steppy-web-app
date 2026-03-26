import fs from "fs";
import path from "path";
import type { CatalogData } from "../types";

let cachedCatalog: CatalogData | null = null;

export function loadCatalog(): CatalogData {
	if (cachedCatalog) return cachedCatalog;
	const filePath = path.join(process.cwd(), "src/data/steppy_catalog.json");
	cachedCatalog = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	return cachedCatalog!;
}
