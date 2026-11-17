# Privacy data map

## Phase 0 prototype (current code)

| Data | Where | Leaves the Mac? |
|---|---|---|
| Target app's menu items (shortcut, identifier, enabled state) | Read in memory through Accessibility | No |
| Menu titles | Read only by the developer **dump** command, saved to a local file | No (review before sharing) |
| Test log: timestamp, macOS version, bundle ID, app version, action ID, outcome, latency | `~/Library/Logs/PlainClickPrototype/trials.csv` | No |
| Window titles, document text, URLs, browsing history, screen contents | Not read, not stored | No |

The prototype makes no network requests.

## Planned for MVP and licensing (not implemented)

| Data | Purpose | Stored |
|---|---|---|
| Email, order ID, country/tax data handled by the payment provider | Purchase, licence delivery, refunds | Payment provider + our `purchases` table |
| Licence key (stored as a hash for lookup) | Activation | Our DB; plaintext only in the customer's email + their Keychain |
| Random installation ID (app-generated, not a hardware serial), app version, activation time | 2-Mac limit, deactivation | Our DB |
| Preferences, pinned actions | Personalisation | Locally on the Mac |

No analytics and no crash uploads by default. Diagnostic reports would be started by the user and redacted.
Because we store purchase and licensing data, never claim "no data collection".
