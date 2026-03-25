import React from "react";

export default function Screen({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-col justify-center items-center w-[1050px] h-[720px] bg-steppy-teal rounded-[24px]">
            {children}
        </div>
    )
}
