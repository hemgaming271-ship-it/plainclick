/**
 * Builds the Dodo static payment link for exactly one copy, in US dollars, with no coupon box.
 * Query parameters from Dodo's integration guide: quantity, redirect_url, paymentCurrency, showCurrencySelector,
 * showDiscounts. Dodo appends payment_id, status, email (and license_key) to redirect_url.
 */
export function dodoBuyUrl(paymentLink: string, siteUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(paymentLink);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !/(^|\.)dodopayments\.com$/.test(u.hostname) || !u.pathname.includes("/buy/")) return null;
  u.searchParams.set("quantity", "1");
  u.searchParams.set("paymentCurrency", "USD");
  u.searchParams.set("showCurrencySelector", "false");
  u.searchParams.set("showDiscounts", "false");
  u.searchParams.set("redirect_url", new URL("/thanks/", siteUrl).toString());
  return u.toString();
}
