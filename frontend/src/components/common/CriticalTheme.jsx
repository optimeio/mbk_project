"use client";

import { useServerInsertedHTML } from "next/navigation";

/**
 * CriticalTheme inlines the most essential CSS variables into the document head.
 * This addresses "Render-blocking requests" for layout.css by ensuring the
 * portal shell (Sidebar, Topbar) can render its core colors and radii
 * immediately upon HTML parsing, without waiting for the large CSS bundle.
 */
export default function CriticalTheme() {
  useServerInsertedHTML(() => {
    return (
      <style
        id="mbk-critical-theme"
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --radius: 0.625rem;
              --background: 0 0% 100%;
              --foreground: 222.2 84% 4.9%;
              --primary: 222.2 47.4% 11.2%;
              --sidebar: oklch(0.985 0 0);
              --sidebar-primary: oklch(0.205 0 0);
              --sidebar-border: oklch(0.922 0 0);
            }
            .dark {
              --background: 222.2 84% 4.9%;
              --foreground: 210 40% 98%;
              --primary: 210 40% 98%;
            }
            body {
               background-color: #f4f7f9;
               color: #0f172a;
            }
            aside[data-app-sidebar="true"] {
               display: none;
            }
            @media (min-width: 768px) {
               aside[data-app-sidebar="true"] {
                  display: flex;
               }
            }
          `,
        }}
      />
    );
  });

  return null;
}
