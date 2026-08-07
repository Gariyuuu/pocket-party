"use client";

import { useEffect } from "react";

/**
 * Only renders if the root layout itself throws — everything else is caught
 * by app/error.tsx first. Kept deliberately minimal and dependency-free
 * (no design-system imports) since if this is on screen, something already
 * went wrong at a level those components can't be trusted to survive.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Pocket Party hit a snag</h1>
        <p style={{ color: "#666" }}>Please try reloading the page.</p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
