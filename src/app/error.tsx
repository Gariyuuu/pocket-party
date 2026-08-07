"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/landing/site-nav";
import { ErrorState } from "@/components/ui/state-panel";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/log";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("app-error-boundary", error, error.digest ? { digest: error.digest } : undefined);
  }, [error]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16">
        <ErrorState
          title="Something went wrong"
          description="This page hit an unexpected error. Try again, or head back to the lobby."
        />
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Back to Pocket Party
          </Button>
        </div>
      </main>
    </>
  );
}
