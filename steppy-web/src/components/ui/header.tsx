"use client"

import Image from "next/image"
import logo from "@/assets/steppy-logo.svg"
import { Settings } from "lucide-react"
import { useState, useRef } from "react"
import {PopoverTrigger, Popover, PopoverTitle, PopoverContent} from "@/components/ui/popover";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

export function Header() {
    const [darkMode, setDarkMode] = useState(false)
    const [limit, setLimit] = useState(10)
    const [tempLimitInput, setTempLimitInput] = useState(limit.toString())
    const triggerRef = useRef<HTMLButtonElement>(null)

    function handleDarkMode(checked: boolean) {
        setDarkMode(checked)
        document.documentElement.classList.toggle("dark", checked)
    }

    function isValidLimit(value: string): boolean {
        const val = parseInt(value)
        return !isNaN(val) && val >= 0 && val <= 50
    }

    function handleSave() {
        if (isValidLimit(tempLimitInput)) {
            const val = parseInt(tempLimitInput)
            setLimit(val)
            triggerRef.current?.click()
        }
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
                <PopoverTrigger ref={triggerRef} className="ml-auto text-gray-500 hover:text-gray-700">
                    <Settings size={30} />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <PopoverTitle>Settings</PopoverTitle>
                    <div className="space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-monaco">Dark Mode</p>
                            <Switch checked={darkMode} onCheckedChange={handleDarkMode} className="scale-125" />
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-monaco">Limit</p>
                            <Input
                                value={tempLimitInput}
                                onChange={(e) => setTempLimitInput(e.target.value)}
                                className={`h-[40px] w-[70px] rounded-[10px] border-0 border-b text-center text-base ${
                                    !isValidLimit(tempLimitInput) && tempLimitInput !== '' ? 'border-2 border-warning text-warning' : ''
                                }`}
                                placeholder={limit.toString()}
                            />
                        </div>
                        <Button size="sm" className="self-end" onClick={handleSave}>Save</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
