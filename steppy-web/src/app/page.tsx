import Screen from "@/components/ui/screen";
import { Header } from "@/components/ui/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
      <div className="flex justify-center items-center w-screen h-screen bg-steppy-bg">
          <Screen>
             <Header />
              <div className="flex flex-col justify-center w-full pl-[24px] pr-[24px] mt-[24px]">
                  <div className="flex flex-row gap-4">
                      <Input placeholder="Search Here..." />
                      <Button>Submit</Button>
                  </div>
              </div>
          </Screen>
      </div>
  );
}
