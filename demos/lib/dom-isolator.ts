import type { Page } from "playwright";

/**
 * Isolates a single Forthweb <article id="..."> tool card cleanly inside the Playwright viewport
 * by hiding site chrome (navbar, hero, ToC sidebar, share buttons, selector pills, footer)
 * while preserving modals rendered via `fixed inset-0` inside the tool subtree.
 */
export async function isolateToolCard(
  page: Page,
  toolId: string,
  opts: { padPx?: number; bgHex?: string } = {}
): Promise<void> {
  const padPx = opts.padPx ?? 24;
  const bgHex = opts.bgHex ?? "#e8e3dc";

  await page.evaluate(
    ([id, pad, bg]) => {
      const target = document.getElementById(id);
      if (!target) {
        throw new Error(`Could not find tool article #${id}`);
      }

      // Inject studio cleanup styles once
      let style = document.getElementById("__forthweb_stage_isolation") as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = "__forthweb_stage_isolation";
        document.head.appendChild(style);
      }

      style.textContent = `
        html, body {
          background: ${bg} !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100vh !important;
          overflow-x: hidden !important;
        }
        nextjs-portal,
        [data-nextjs-toast],
        #nextjs__container_errors_label {
          display: none !important;
        }
        .__forthweb_hidden_sibling {
          display: none !important;
        }
        .__forthweb_stage_outer {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .__forthweb_stage_center {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: 100vh !important;
          margin: 0 auto !important;
          padding: ${pad}px !important;
          border: none !important;
          box-shadow: none !important;
          grid-column: 1 / -1 !important;
          background: transparent !important;
        }
        #${CSS.escape(id)} {
          width: 100% !important;
          max-width: 996px !important;
          margin: 0 auto !important;
          box-shadow: 0 8px 28px -8px rgba(24, 20, 17, 0.08), 0 0 0 1px rgba(24, 20, 17, 0.06) !important;
        }
      `;

      // Hide all siblings along ancestor chain up to <body>, applying padding only once on immediate parent
      const immediateParent = target.parentElement;
      let cur: HTMLElement | null = target;
      while (cur && cur !== document.body && cur.parentElement) {
        const parent: HTMLElement = cur.parentElement;
        for (const child of Array.from(parent.children)) {
          if (child !== cur && child instanceof HTMLElement && child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
            child.classList.add("__forthweb_hidden_sibling");
          }
        }
        if (parent !== document.body) {
          parent.classList.add(
            parent === immediateParent ? "__forthweb_stage_center" : "__forthweb_stage_outer"
          );
        }
        cur = parent;
      }

      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [toolId, padPx, bgHex] as [string, number, string]
  );

  await page.waitForTimeout(180);
}
