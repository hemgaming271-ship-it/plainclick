# Support and recovery guide (internal)

Never ask a customer to email their licence key. Never paste keys, webhook bodies or customer emails into public issue trackers.

| Situation | What to do |
|---|---|
| Lost licence email | Send them to `/recover`. They get a single-use link, valid for 30 minutes. |
| Email never arrived | Check `email_jobs` for that purchase: `status`, `attempts`, `last_error`. If `failed`, fix the cause, then `UPDATE email_jobs SET status='pending', next_attempt_at=now() WHERE id=…`. The key is still in `licences.key_ciphertext`, so recovery also works. |
| "Already active on two Macs" | In-app: Manage Licence → Deactivate this Mac on the old one. If that Mac is lost or broken, use `/recover` → "Show key and reset all my Macs". |
| Purchase in `needs_review` | The price, currency, discount or quantity didn't match the configuration. Check it in the Paddle dashboard. If it's genuine, fix the config, then either refund or create the licence manually (write a one-off script that reuses `fulfilment.ts` logic, with a code review). |
| Refund request within 14 days | Refund it in Paddle. The webhook revokes the licence automatically. |
| App says "not supported" | Expected for apps not in the compatibility table. Log the request; don't promise a date. |
| Accessibility problems | Have them remove and re-add PlainClick in System Settings → Privacy & Security → Accessibility, then relaunch. |
| Uninstall | Quit → delete the app → remove it from the Accessibility list → optionally delete its preferences. The Keychain items are under service `local.plainclick.licence`. |
| Business closure | Activated copies keep working offline (non-expiring entitlement). Publish a final note, and either a licence-free final build or keep `/validate` returning `valid`. |
