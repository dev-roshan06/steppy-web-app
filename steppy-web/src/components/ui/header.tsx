import Image from "next/image"
import logo from "@/assets/steppy-logo.svg"
import { Settings } from "lucide-react"

export function Header() {
    return (
        <div className="relative flex items-center w-full h-[60px] bg-steppy-panel rounded-t-[24px] px-8">
            <button>
                <Image src={logo} alt="Steppy logo" height={60} width={60} />
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 text-2xl font-medium text-gray-600" style={{ fontFamily: 'var(--font-hind)' }}>
                Steppy
            </span>
            <button className="ml-auto text-gray-500 hover:text-gray-700">
                <Settings size={30} />
            </button>
        </div>
    )
}
