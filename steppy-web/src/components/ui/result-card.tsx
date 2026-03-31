"use client"

import { Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import gherkin from "react-syntax-highlighter/dist/esm/languages/hljs/gherkin"
import { dracula, github } from "react-syntax-highlighter/dist/esm/styles/hljs"

SyntaxHighlighter.registerLanguage("gherkin", gherkin)

interface ResultCardProps {
    title: string
    steps: string[]
}

export function ResultCard({ title, steps }: ResultCardProps) {
    const [isDarkMode, setIsDarkMode] = useState(false)

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains("dark"))
        }
        checkDarkMode()

        const observer = new MutationObserver(checkDarkMode)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

        return () => observer.disconnect()
    }, [])

    return (
        <div className="relative flex flex-col gap-1.5 rounded-[18px] px-4 py-3 bg-result">
            <p className="text-sm font-bold text-text pr-8 font-monaco">
                {title}
            </p>
            <div className="pr-8 font-monaco">
                <SyntaxHighlighter
                    language="gherkin"
                    style={isDarkMode ? dracula : github}
                    customStyle={{
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        fontSize: "0.8rem",
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
