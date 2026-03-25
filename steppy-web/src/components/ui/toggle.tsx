import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";

export function Toggle() {
    return (
        <Tabs className="flex items-center">
            <TabsList>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
        </Tabs>
    )
}