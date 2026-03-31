"use client";

import { useState } from "react";
import Screen from "@/components/ui/screen";
import { Header } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResultCard } from "@/components/ui/result-card";
import type { SearchResult } from "@/lib/search";

type TabValue = "scenarios" | "steps" | "all";

interface SearchResults {
    steps: SearchResult[];
    scenarios: SearchResult[];
}

export default function Home() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>("all");

    async function handleSearch() {
        const q = query.trim();
        if (!q) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all`);
            const data: SearchResults = await res.json();
            setResults(data);
        } finally {
            setIsLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") handleSearch();
    }

    const visibleResults: { title: string; steps: string[] }[] = (() => {
        if (!results) return [];
        const scenarioCards = (activeTab === "scenarios" || activeTab === "all")
            ? results.scenarios.map(r => ({
                title: r.name ?? "",
                steps: r.steps ?? [],
            }))
            : [];
        const stepCards = (activeTab === "steps" || activeTab === "all")
            ? results.steps.map(r => ({
                title: r.examples ? r.examples[0] : "",
                steps: r.examples ?? [],
            }))
            : [];
        return [...scenarioCards, ...stepCards];
    })();

    return (
        <div className="flex justify-center items-center w-screen h-screen bg-background">
            <Screen>
                <Header />
                <div className="flex flex-col justify-center w-full px-[24px] gap-6">
                    <div className="flex flex-row gap-4">
                        <Input
                            placeholder="Search Here..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? "..." : "Submit"}
                        </Button>
                    </div>
                    <Toggle value={activeTab} onValueChange={v => setActiveTab(v as TabValue)} />
                </div>
                <div className="flex-1 min-h-0 w-full h-full px-[24px] pb-[24px]">
                    <ScrollArea className="h-full w-full rounded-[18px] p-1.5">
                        <div className="flex flex-col gap-3 p-4">
                            {!results && !isLoading && (
                                <p className="text-sm text-text/60 text-center py-8 font-monaco">
                                    Enter a search query to find steps and scenarios.
                                </p>
                            )}
                            {results && visibleResults.length === 0 && (
                                <p className="text-sm text-text/60 text-center py-8 font-monaco">
                                    No results found.
                                </p>
                            )}
                            {visibleResults.map((item, i) => (
                                <ResultCard
                                    key={i}
                                    title={item.title}
                                    steps={item.steps}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </Screen>
        </div>
    );
}
