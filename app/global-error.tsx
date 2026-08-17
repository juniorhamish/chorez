"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: Readonly<{
  error: Error & { digest?: string };
  retry: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // global-error must include html and body tags, and does not include global styles/fonts.
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#FDFCF0",
          color: "#2D336B",
        }}
      >
        <div
          style={{
            maxWidth: "384px",
            width: "100%",
            textAlign: "center",
            background: "#fff",
            borderRadius: "2.5rem",
            padding: "32px",
            border: "1px solid #eef2ff",
            boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.15)",
          }}
        >
          <h2 style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: "8px" }}>Something went wrong</h2>
          <p style={{ color: "rgba(79, 70, 229, 0.7)", fontWeight: 500, fontSize: "0.875rem", marginBottom: "32px" }}>
            We hit an unexpected error loading the app. Please try again.
          </p>
          <button
            onClick={() => retry()}
            style={{
              width: "100%",
              background: "#4f46e5",
              color: "#fff",
              padding: "16px",
              borderRadius: "1rem",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
