"use client"
import {Bot, Settings} from "lucide-react"
import { useState, useRef } from "react"
import {
    PopoverTrigger,
    Popover,
    PopoverTitle,
    PopoverContent,
} from "@/components/ui/popover";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
interface HeaderProps {
    onLimitChange: (limit: number) => void
}

export function Header({ onLimitChange }: HeaderProps) {
    const [darkMode, setDarkMode] = useState(false)
    const [tempLimitInput, setTempLimitInput] = useState("10")
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
            onLimitChange(val)
            triggerRef.current?.click()
        }
    }

    return (
        <div className="relative flex items-center w-full h-[60px] bg-steppy-teal rounded-t-[24px] p-8">
            <Popover>
                <PopoverTrigger className='mr-auto text-button-text hover:text-gray-400'>
                    {/*<Image src={logo} alt="Steppy logo" height={60} width={60} />*/}
                    <Bot size={25}/>
                </PopoverTrigger>
                <PopoverContent align="center">
                    <PopoverTitle className="flex justify-center">Steppy</PopoverTitle>
                    <div className="flex flex-col justify-center items-center font-monaco">
                        <p className="text-gray-400 text-xs">1.0.0</p>
                    </div>
                </PopoverContent>
            </Popover>

            <span className="absolute left-1/2 -translate-x-1/2 text-lg font-monaco text-button-text">
                Steppy
            </span>
            <Popover>
                <PopoverTrigger ref={triggerRef} className="ml-auto text-button-text hover:text-gray-400">
                    <Settings size={25} />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="center">
                    <PopoverTitle>Settings</PopoverTitle>
                    <div className="space-y-4 flex flex-col">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-monaco">Dark Mode</p>
                            <Switch checked={darkMode} onCheckedChange={handleDarkMode} className="scale-125" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-row gap-2">
                                <p className="text-sm font-monaco">Limit</p>
                                <p className="text-sm font-monaco opacity-30">(for each)</p>
                            </div>
                            <Input
                                value={tempLimitInput}
                                onChange={(e) => setTempLimitInput(e.target.value)}
                                className={`h-[40px] w-[70px] rounded-[10px] border-0 border-b text-center text-base ${
                                    !isValidLimit(tempLimitInput) && tempLimitInput !== '' ? 'border-2 border-warning text-warning' : ''
                                }`}
                                placeholder={tempLimitInput}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            {!isValidLimit(tempLimitInput)
                                ? <p className="text-xs font-monaco text-warning">Limit must be between 1 – 50</p>
                                : <span />
                            }
                            <Button size="sm" onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}