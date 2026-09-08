"use client";

import { useEffect } from "react";

export default function StripInjectedAttrs() {
  useEffect(() => {
    const ATTR = "fdprocessedid";

    const removeAttrFromNode = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.hasAttribute && node.hasAttribute(ATTR)) {
        node.removeAttribute(ATTR);
      }
      if (node.querySelectorAll) {
        node
          .querySelectorAll(`[${ATTR}]`)
          .forEach((el) => el.removeAttribute(ATTR));
      }
    };

    const root = document.documentElement;
    removeAttrFromNode(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === ATTR) {
          mutation.target.removeAttribute(ATTR);
        }
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => removeAttrFromNode(node));
        }
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [ATTR],
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return null;
}
