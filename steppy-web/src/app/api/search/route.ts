import { NextRequest, NextResponse } from "next/server";
import { SearchEngine, loadCatalog } from "@/lib/search";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const q = searchParams.get("q")?.trim();
	const type = searchParams.get("type") ?? "all";
	const limit = Number(searchParams.get("limit")) || 10;

	if (!q) {
		return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
	}

	const catalog = loadCatalog();
	const flags = { limit };

	const steps =
		type === "steps" || type === "all"
			? SearchEngine.searchSteps(q, catalog.steps, flags)
			: [];

	const scenarios =
		type === "scenarios" || type === "all"
			? SearchEngine.searchScenarios(q, catalog.scenarios, flags)
			: [];

	return NextResponse.json({ steps, scenarios });
}
