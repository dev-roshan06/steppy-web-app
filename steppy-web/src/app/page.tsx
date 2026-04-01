"use client";

import { useState } from "react";
import Screen from "@/components/ui/screen";
import { Header } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResultCard } from "@/components/ui/result-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

type TabValue = "scenarios" | "steps" | "all";

export default function Home() {
    const [activeTab, setActiveTab] = useState<TabValue>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 10;

    const { query, setQuery, results, isLoading, searchLimit, setSearchLimit, handleSearch, getVisibleResults } = useSearch();

    async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") await handleSearch();
    }

    const visibleResults = getVisibleResults(activeTab);

    const totalPages = Math.ceil(visibleResults.length / perPage);
    const paginatedResults = visibleResults.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage
    );

    return (
        <div className="flex justify-center items-center w-screen h-screen bg-background">
            <Screen>
                <Header onLimitChange={(limit) => {
                    setSearchLimit(limit);
                    setCurrentPage(1);
                    handleSearch(limit);
                }} />
                <div className="flex flex-col justify-center w-full px-[24px] gap-6">
                    <div className="flex flex-row gap-4">
                        <Input
                            placeholder="Search Here..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button onClick={() => handleSearch()} disabled={isLoading}>
                            {isLoading ? "..." : "Submit"}
                        </Button>
                    </div>
                    <Toggle value={activeTab} onValueChange={v => {
                        setActiveTab(v as TabValue)
                        setCurrentPage(1)
                    }} />
                </div>
                <div className="flex flex-col min-h-0 w-full h-full px-[24px] pb-[24px]">
                    <div className="flex flex-col h-full rounded-[18px] bg-scroll-area overflow-hidden">
                        <ScrollArea className="flex-1 w-full p-1.5">
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
                                {paginatedResults.map((item, i) => (
                                    <ResultCard
                                        key={i}
                                        title={item.title}
                                        steps={item.steps}
                                        type={item.type}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 py-3">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="hover:opacity-70 disabled:opacity-30"
                                >
                                    <ChevronLeft className="text-popover-text"/>
                                </button>
                                <span className="text-text font-monaco text-sm">
                                    {currentPage}/{totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="hover:opacity-70 disabled:opacity-30"
                                >
                                    <ChevronRight className="text-popover-text"/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Screen>
        </div>
    );
}
