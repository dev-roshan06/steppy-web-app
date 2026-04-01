import React from "react";

export default function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center m-20 w-full h-[calc(100%-2rem)] bg-foreground rounded-[24px] gap-6">
            {children}
        </div>
    )
}
