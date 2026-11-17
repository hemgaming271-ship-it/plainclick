import { compatibility, statusLabel } from "@/lib/compatibility";

export function CompatTable() {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-base">
        <caption className="sr-only">PlainClick app and action compatibility</caption>
        <thead className="bg-surface">
          <tr>
            {["App", "Action", "Status", "macOS", "App version"].map((h) => (
              <th key={h} scope="col" className="border-b border-line px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compatibility.map((r) => (
            <tr key={r.app + r.action} className="border-b border-line last:border-0">
              <td className="px-3 py-2">{r.app}</td>
              <td className="px-3 py-2">{r.action}</td>
              <td className="px-3 py-2">{statusLabel[r.status]}</td>
              <td className="px-3 py-2 text-muted">{r.macOS ?? "—"}</td>
              <td className="px-3 py-2 text-muted">{r.appVersion ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
