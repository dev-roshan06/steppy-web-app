import * as fs from "node:fs";
import * as path from "node:path";

// Helper to recursively find files
export function findFiles(dir: string, extension: string): string[] {
	let results: string[] = [];
	if(!fs.existsSync(dir)) return results;

	const list = fs.readdirSync(dir);
	list.forEach(file => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);
		if(stat?.isDirectory()) {
			results = results.concat(findFiles(filePath, extension));
		} else if(file.endsWith(extension)) {
			results.push(filePath);
		}
	});
	return results;
}
