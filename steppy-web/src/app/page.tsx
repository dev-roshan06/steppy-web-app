import Screen from "@/components/ui/screen";
import {Header} from "@/components/ui/header";

export default function Home() {
  return (
      <div className="flex justify-center items-center w-screen h-screen bg-steppy-bg">
          <Screen>
             <Header />
          </Screen>
      </div>
  );
}
