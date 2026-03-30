import React from "react";

export default function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center w-[1050px] h-[720px] bg-foreground rounded-[24px] gap-6">
            {children}
        </div>
    )
}
