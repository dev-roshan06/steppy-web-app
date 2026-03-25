"use client"

import { Copy } from "lucide-react"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import gherkin from "react-syntax-highlighter/dist/esm/languages/hljs/gherkin"
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs"

SyntaxHighlighter.registerLanguage("gherkin", gherkin)

interface ResultCardProps {
    title: string
    steps: string[]
}

export function ResultCard({ title, steps }: ResultCardProps) {
    return (
        <div className="relative flex flex-col gap-1.5 rounded-[18px] px-4 py-3 shadow-sm">
            <p className="text-sm font-bold text-gray-700 pr-8" style={{ fontFamily: 'Monaco, Menlo, monospace' }}>
                {title}
            </p>
            <div className="pr-8">
                <SyntaxHighlighter
                    language="gherkin"
                    style={githubGist}
                    customStyle={{
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        fontSize: "0.8rem",
                        fontFamily: "Monaco, Menlo, monospace",
                    }}
                >
                    {steps.join("\n")}
                </SyntaxHighlighter>
            </div>
            <button className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors">
                <Copy size={16} />
            </button>
        </div>
    )
}
