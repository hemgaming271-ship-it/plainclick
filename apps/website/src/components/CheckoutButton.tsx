"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    Paddle?: any;
  }
}

/**
 * Opens Paddle.js overlay checkout. Rendered ONLY when site.checkoutEnabled is true.
 * The browser success event never unlocks anything; licences are issued from the verified webhook only.
 * VERIFY the Paddle.js v2 API (Environment.set / Initialize / Checkout.open) against current docs before enabling.
 */
export function CheckoutButton({ clientToken, priceId, env }: { clientToken: string; priceId: string; env: "sandbox" | "production" }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="lazyOnload"
        onLoad={() => {
          try {
            if (env === "sandbox") window.Paddle.Environment.set("sandbox");
            window.Paddle.Initialize({ token: clientToken });
            setReady(true);
          } catch {
            setError("Checkout couldn't load. Please refresh, or contact support.");
          }
        }}
        onError={() => setError("Checkout couldn't load. Please check your connection and try again.")}
      />
      <button
        type="button"
        disabled={!ready}
        onClick={() => window.Paddle?.Checkout.open({ items: [{ priceId, quantity: 1 }] })}
        className="min-h-11 rounded-md bg-accent px-6 py-2.5 text-base font-semibold text-accent-ink disabled:opacity-60"
      >
        {ready ? "Buy PlainClick — US$5.99" : "Loading checkout…"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
    </>
  );
}
