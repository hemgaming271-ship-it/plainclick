"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/ui";

const messages: Record<string, string> = {
  error: "Checkout couldn't start. Nothing was charged. Please try again in a minute, or contact support.",
  busy: "Too many checkout attempts from this connection. Please wait a little and try again.",
  closed: "Checkout isn't open right now.",
};

/** Reads ?checkout=… on the client so the pricing page can stay static. */
export function CheckoutNotice() {
  const [msg, setMsg] = useState<string | undefined>();
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("checkout");
    setMsg(k ? messages[k] : undefined);
  }, []);
  if (!msg) return null;
  return (
    <div className="mb-4" role="alert">
      <Notice>{msg}</Notice>
    </div>
  );
}
