import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MAX_BODY_BYTES, parseJson, readBodyLimited } from "@/server/http";
import { clientIp } from "@/server/rateLimit";

const schema = z.object({ email: z.string() });

function streamOf(parts: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

describe("parseJson body limit", () => {
  it("parses a small valid body", async () => {
    const req = new Request("http://x/api", { method: "POST", body: JSON.stringify({ email: "a@b.c" }) });
    expect(await parseJson(req, schema)).toEqual({ email: "a@b.c" });
  });

  it("rejects an oversized declared body", async () => {
    const req = new Request("http://x/api", { method: "POST", body: "{}", headers: { "content-length": "99999" } });
    expect(await parseJson(req, schema)).toBeNull();
  });

  it("rejects an oversized chunked body with no Content-Length", async () => {
    const big = "x".repeat(MAX_BODY_BYTES);
    const req = new Request("http://x/api", { method: "POST", body: streamOf(['{"email":"', big, '"}']), duplex: "half" } as RequestInit);
    expect(req.headers.get("content-length")).toBeNull();
    expect(await readBodyLimited(req)).toBeNull();
  });

  it("returns null for invalid JSON or schema mismatch", async () => {
    expect(await parseJson(new Request("http://x", { method: "POST", body: "{" }), schema)).toBeNull();
    expect(await parseJson(new Request("http://x", { method: "POST", body: '{"email":1}' }), schema)).toBeNull();
  });
});

describe("clientIp", () => {
  it("ignores a spoofed left-most X-Forwarded-For entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" });
    expect(clientIp(h, {} as unknown as NodeJS.ProcessEnv)).toBe("203.0.113.9");
  });

  it("honours TRUSTED_PROXY_COUNT", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7, 10.0.0.1" });
    expect(clientIp(h, { TRUSTED_PROXY_COUNT: "2" } as unknown as NodeJS.ProcessEnv)).toBe("198.51.100.7");
  });

  it("uses CLIENT_IP_HEADER only when configured", () => {
    const h = new Headers({ "cf-connecting-ip": "192.0.2.1", "x-real-ip": "6.6.6.6", "x-forwarded-for": "1.2.3.4" });
    expect(clientIp(h, {} as unknown as NodeJS.ProcessEnv)).toBe("1.2.3.4");
    expect(clientIp(h, { CLIENT_IP_HEADER: "cf-connecting-ip" } as unknown as NodeJS.ProcessEnv)).toBe("192.0.2.1");
  });

  it("falls back to unknown", () => {
    expect(clientIp(new Headers(), {} as unknown as NodeJS.ProcessEnv)).toBe("unknown");
  });
});
