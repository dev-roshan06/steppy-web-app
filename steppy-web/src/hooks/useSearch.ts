import { useState } from "react";
import type { SearchResult } from "@/lib/search";

type TabValue = "scenarios" | "steps" | "all";

interface SearchResults {
    steps: SearchResult[];
    scenarios: SearchResult[];
}

export function useSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchLimit, setSearchLimit] = useState(10);

    async function handleSearch(limitOverride?: number) {
        const q = query.trim();
        if (!q) return;
        setIsLoading(true);
        try {
            const limit = limitOverride ?? searchLimit;
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all&limit=${limit}`);
            const data: SearchResults = await res.json();
            setResults(data);
        } finally {
            setIsLoading(false);
        }
    }

    function getVisibleResults(activeTab: TabValue) {
        if (!results) return [];
        const scenarioCards = (activeTab === "scenarios" || activeTab === "all")
            ? results.scenarios.map(r => ({
                title: r.name ?? "",
                steps: r.steps ?? [],
                type: "scenario" as const,
            }))
            : [];
        const stepCards = (activeTab === "steps" || activeTab === "all")
            ? results.steps.map(r => ({
                title: r.examples ? r.examples[0] : "",
                steps: r.examples ?? [],
                type: "step" as const,
            }))
            : [];
        return [...scenarioCards, ...stepCards];
    }

    return {
        query,
        setQuery,
        results,
        isLoading,
        searchLimit,
        setSearchLimit,
        handleSearch,
        getVisibleResults,
    };
}
