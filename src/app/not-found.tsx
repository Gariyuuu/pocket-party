import Link from "next/link";
import { SiteNav } from "@/components/landing/site-nav";
import { EmptyState } from "@/components/ui/state-panel";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16">
        <EmptyState
          icon={Compass}
          title="Nothing here"
          description="This page, room, or game doesn't exist — it may have expired or the link was mistyped."
        />
        <Button render={<Link href="/" />}>Back to Pocket Party</Button>
      </main>
    </>
  );
}
