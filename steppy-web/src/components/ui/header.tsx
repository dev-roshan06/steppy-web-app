"use client"

import Image from "next/image"
import logo from "@/assets/steppy-logo.svg"
import { Settings } from "lucide-react"
import { useState } from "react"
import {PopoverTrigger, Popover, PopoverTitle, PopoverContent} from "@/components/ui/popover";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";

export function Header() {
    const [darkMode, setDarkMode] = useState(false)
    const [limit, setLimit] = useState(10)

    function handleDarkMode(checked: boolean) {
        setDarkMode(checked)
        document.documentElement.classList.toggle("dark", checked)
    }

    function handleLimitChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = parseInt(e.target.value)
        if (!isNaN(val)) setLimit(val)
    }

    return (
        <div className="relative flex items-center w-full h-[60px] bg-steppy-teal rounded-t-[24px] px-8">
            <button>
                <Image src={logo} alt="Steppy logo" height={60} width={60} />
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 text-2xl font-medium text-gray-600 dark:text-[#F8F8F2]" style={{ fontFamily: 'var(--font-hind)' }}>
                Steppy
            </span>
            <Popover>
                <PopoverTrigger className="ml-auto">
                    <button className="text-gray-500 hover:text-gray-700">
                        <Settings size={30} />
                    </button>
                </PopoverTrigger>
                <PopoverContent>
                    <PopoverTitle>Settings</PopoverTitle>
                    <div className="flex items-center justify-between">
                        <p style={{ fontFamily: 'Monaco, Menlo, monospace' }}>Dark Mode</p>
                        <Switch checked={darkMode} onCheckedChange={handleDarkMode} />
                    </div>
                    <div className="flex items-center justify-between">
                        <p style={{ fontFamily: 'Monaco, Menlo, monospace' }}>Limit</p>
                        <Input
                            id="limit"
                            value={limit}
                            onChange={handleLimitChange}
                            className={`w-[65px] h-[30px] rounded-xs`}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
