import { describe, expect, it } from "vitest";
import { dodoBuyUrl } from "@/lib/dodoLink";

describe("Dodo payment link (free static mode)", () => {
  it("adds quantity 1, USD only, no coupon box and the thanks return URL", () => {
    const u = new URL(dodoBuyUrl("https://checkout.dodopayments.com/buy/pdt_abc", "https://plainclick.example")!);
    expect(u.origin + u.pathname).toBe("https://checkout.dodopayments.com/buy/pdt_abc");
    expect(Object.fromEntries(u.searchParams)).toEqual({
      quantity: "1",
      paymentCurrency: "USD",
      showCurrencySelector: "false",
      showDiscounts: "false",
      redirect_url: "https://plainclick.example/thanks/",
    });
  });

  it("overrides a quantity already in the pasted link", () => {
    const u = new URL(dodoBuyUrl("https://checkout.dodopayments.com/buy/pdt_abc?quantity=5", "https://x.example")!);
    expect(u.searchParams.get("quantity")).toBe("1");
  });

  it("refuses anything that isn't an https Dodo /buy/ link (so a typo can't send buyers elsewhere)", () => {
    for (const bad of ["", "not a url", "http://checkout.dodopayments.com/buy/pdt_abc", "https://evil.example/buy/pdt_abc",
      "https://dodopayments.com.evil.example/buy/x", "https://checkout.dodopayments.com/pricing"]) {
      expect(dodoBuyUrl(bad, "https://x.example")).toBeNull();
    }
  });
});
