import { site } from "@/lib/site";
import { config } from "@/server/config";
import { getDb } from "@/server/db";
import { ipAllowed } from "@/server/http";
import { getDodo } from "@/server/payments";
import { LIMITS } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (query: string) => Response.redirect(new URL(`/pricing?checkout=${query}`, config.siteUrl()), 303);

/**
 * Plain HTML form POST from /pricing → a fresh single-use Dodo checkout session → 303 to Dodo's hosted checkout.
 * Nothing is unlocked here or on the return page: licences come ONLY from the verified payment.succeeded webhook.
 */
export async function POST(req: Request) {
  if (!site.checkoutEnabled || config.paymentProvider() !== "dodo") return back("closed");
  try {
    if (!(await ipAllowed(getDb(), req, "checkout-ip", LIMITS.checkoutIp))) return back("busy");
    const url = await getDodo().createCheckout({
      productId: config.dodo().productId,
      returnUrl: new URL("/thanks", config.siteUrl()).toString(),
    });
    return Response.redirect(url, 303);
  } catch (e: any) {
    console.error("checkout session failed:", e?.message);
    return back("error");
  }
}
