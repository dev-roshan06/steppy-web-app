import Screen from "@/components/ui/screen";
import {Header} from "@/components/ui/header";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Toggle} from "@/components/ui/toggle";
import {ScrollArea} from "@/components/ui/scroll-area";
import {ResultCard} from "@/components/ui/result-card";
import results from "@/data/results.json";

export default function Home() {
    return (
        <div className="flex justify-center items-center w-screen h-screen bg-steppy-bg">
            <Screen>
                <Header/>
                <div className="flex flex-col justify-center w-full px-[24px] gap-6">
                    <div className="flex flex-row gap-4">
                        <Input placeholder="Search Here..."/>
                        <Button>Submit</Button>
                    </div>
                    <Toggle/>
                </div>
                <div className="flex-1 min-h-0 w-full h-full px-[24px] pb-[24px]">
                    <ScrollArea className="h-full w-full rounded-[18px] bg-steppy-panel p-1.5">
                        <div className="flex flex-col gap-3 p-4">
                            {results.map((item) => (
                                <ResultCard
                                    key={item.id}
                                    title={item.title}
                                    steps={item.steps}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </Screen>
        </div>
    );
}
