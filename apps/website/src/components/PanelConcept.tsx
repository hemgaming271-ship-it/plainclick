/**
 * A static HTML illustration of the planned panel. It is NOT a screenshot. Replace it with real screenshots
 * or a recording once a tested build exists.
 */
export function PanelConcept() {
  const actions = ["Reload", "New Tab"];
  return (
    <figure className="mx-auto w-full max-w-sm">
      <div className="rounded-lg border-2 border-line bg-surface shadow-sm" aria-hidden="true">
        <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm text-muted">
          <span>PlainClick</span>
          <span>⌃⌥P</span>
        </div>
        <div className="space-y-2.5 p-4">
          <p className="text-sm">
            <span className="text-muted">Target:</span> <strong>Safari</strong>
          </p>
          {actions.map((a) => (
            <div key={a} className="rounded-md border border-line px-3 py-2 text-base text-ink">
              {a}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">
        <strong className="text-ink">Concept illustration, not a screenshot.</strong> PlainClick opens beside the app;
        Safari&apos;s own toolbar stays exactly as it is.
      </figcaption>
    </figure>
  );
}
