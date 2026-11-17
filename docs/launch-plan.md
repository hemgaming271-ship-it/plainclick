# Launch plan — budget and business checks (draft)

Prices are approximate as of writing and **must be re-checked** before you commit. Nothing has been purchased or signed up for.

## Fixed / recurring costs (first year)

| Item | Estimate | Notes |
|---|---|---|
| Apple Developer Program | US$99 / year | Required for Developer ID signing + notarization |
| Mac access | US$0 if you own a Mac on macOS 14+; otherwise a used Apple-silicon Mac (~US$400–700) or a cloud Mac (~US$30–100+/month; many have a minimum lease, e.g. 24 h) | A cloud Mac is fine for building, but permission and UI testing is far easier on a physical Mac |
| Domain | ~US$10–20 / year | Name not checked for availability |
| Web hosting + serverless routes | US$0–20 / month | Free tiers often prohibit commercial use; check the terms before choosing |
| PostgreSQL | US$0–25 / month | A small managed instance is enough |
| Transactional email | US$0–20 / month | The free tier is usually enough at launch volumes |
| Release storage + bandwidth | ~US$0–5 / month | The app should be a few MB |

## Per-sale economics (illustrative, verify provider pricing)

If the payment provider charges about 5% + US$0.50 per transaction (a common merchant-of-record rate; confirm current Paddle terms):

| | US$ |
|---|---|
| List price | 5.99 |
| Provider fee (≈5% + 0.50) | ≈ 0.80 |
| **Payment revenue to us, before tax effects** | **≈ 5.19** |

That is revenue, not profit. Subtract refunds (plan for 3–10%), support time, and fixed costs. Break-even on about
US$250–450 per year of fixed costs is roughly **50–90 sales per year**, before counting your time. Check whether the
price is shown tax-inclusive or tax-exclusive for each region; this changes what the buyer sees.

## Before expanding
- Find out whether beta users prefer the panel over the free Reduce Transparency / Increase Contrast settings plus each app's own shortcuts.
- Ask which specific workflows they use. Expand only those app adapters.
- Measure actual trial→purchase conversion. Complaint threads are not purchase intent.
