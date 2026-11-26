import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SiteFooter } from "@/components/SiteChrome";

it("keeps the footer's compatibility note without a pre-release label", () => {
  const footer = renderToStaticMarkup(createElement(SiteFooter));

  expect(footer).toContain("macOS 26 test machines");
  expect(footer).toContain('href="/compatibility"');
  expect(footer).not.toMatch(/\b(?:beta|pre-release)\b/i);
});
