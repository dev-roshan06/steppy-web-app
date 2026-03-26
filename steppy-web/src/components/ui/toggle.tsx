import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";

interface ToggleProps {
    value?: string;
    onValueChange?: (value: string) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
    return (
        <Tabs
            className="flex items-center"
            value={value}
            onValueChange={onValueChange ? (val) => onValueChange(String(val)) : undefined}
        >
            <TabsList>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
