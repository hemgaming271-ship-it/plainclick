"use client";

import { useState, type FormEvent } from "react";

export function WaitlistForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), consent: form.get("consent") === "on" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Please check your email address and the consent box.");
      setMessage(data.message);
      setState("done");
    } catch (err: any) {
      setMessage(err.message ?? "Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "done") return <p role="status" className="text-base">{message}</p>;

  return (
    <form onSubmit={submit} className="max-w-md space-y-3" noValidate>
      <label htmlFor="wl-email" className="block font-semibold">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="wl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="min-h-11 flex-1 rounded-md border-2 border-line bg-surface px-3 text-base text-ink"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="min-h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60"
        >
          {state === "sending" ? "Joining…" : "Join the beta"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4" />
        <span>Email me when the beta opens. I can ask to be removed at any time. No marketing list, no sharing.</span>
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
