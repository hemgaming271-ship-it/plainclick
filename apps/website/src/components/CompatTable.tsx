import { compatibility, type Status, statusLabel } from "@/lib/compatibility";

const pill: Record<Status, string> = {
  verified: "bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] text-ink",
  automated: "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-ink",
  limited: "bg-[var(--warn-bg)] text-[var(--warn-ink)]",
  candidate: "bg-surface text-muted",
  dropped: "bg-surface text-muted",
};

export function CompatTable() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-soft">
      <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
        <caption className="sr-only">PlainClick app and action compatibility</caption>
        <thead>
          <tr className="text-[13px] text-muted">
            {["App", "Action", "Status", "macOS tested", "App version"].map((h) => (
              <th key={h} scope="col" className="border-b border-line px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compatibility.map((r) => (
            <tr key={r.app + r.action} className="border-b border-line align-top last:border-0">
              <td className="px-5 py-3 font-semibold">{r.app}</td>
              <td className="px-5 py-3">{r.action}</td>
              <td className="px-5 py-3">
                <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium ${pill[r.status]}`}>
                  {statusLabel[r.status]}
                </span>
                {r.note && <span className="mt-1.5 block max-w-xs text-[13px] text-muted">{r.note}</span>}
              </td>
              <td className="px-5 py-3 text-[13px] text-muted">{r.macOS ?? "—"}</td>
              <td className="px-5 py-3 text-[13px] text-muted">{r.appVersion ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
