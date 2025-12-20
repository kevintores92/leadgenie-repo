import { PropsWithChildren } from "react";
import { AiOffToggle } from "@/components/app/AiOffToggle";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-end px-4">
          <AiOffToggle />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
