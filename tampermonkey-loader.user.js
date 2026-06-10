// ==UserScript==
// @name           hl-js-local-preview-loader
// @namespace      higherlogic-local-dev
// @version        1.0.0
// @description    Stable Tampermonkey loader for local JS preview development. Installs once; loads the generated preview script from your local watcher.
// @author         HL Local Preview
//
// Match the same pages you target in .env.local (SITE_URL). Add or adjust @match lines as needed.
// @match          https://econversetest.connectedcommunity.org/caileesandbox/*
//
// Required for fetching js-local-preview.js from the local preview server (watch_js.py).
// @connect        127.0.0.1
// @connect        localhost
// @grant          GM_xmlhttpRequest
// @grant          GM_addElement
// @grant          unsafeWindow
//
// Run after page scripts (jQuery, plugins) load — same timing as CMS custom JS.
// @run-at         window-load
// ==/UserScript==

/**
 * Tampermonkey loader — install this file once in Tampermonkey and leave it alone.
 *
 * How the pieces fit together:
 *   main.js              →  you edit this (source of truth)
 *   watch_js.py          →  watches main.js and regenerates js-local-preview.js
 *   preview/js-local-preview.js  →  generated preview wrapper; served over HTTP
 *   this loader          →  fetches the preview script on each page load (cache-busted)
 *
 * Development workflow:
 *   1. Install this script in Tampermonkey.
 *   2. Run: python3 scripts/watch_js.py  (starts the preview server on port 5500)
 *   3. Edit main.js and save.
 *   4. Refresh the browser — no need to reinstall the userscript.
 *
 * If loading fails, check that watch_js.py is running and the preview URL is reachable.
 */
(function () {
  "use strict";

  // --- local preview settings (rarely need to change) ---
  const PREVIEW_HOST = "127.0.0.1";
  const PREVIEW_PORT = 5500;
  const PREVIEW_SCRIPT = "preview/js-local-preview.js";
  const LOG_PREFIX = "[hl-js-local-preview:loader]";
  const previewUrl = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/${PREVIEW_SCRIPT}`;

  function loadPreviewScript() {
    GM_xmlhttpRequest({
      method: "GET",
      url: `${previewUrl}?t=${Date.now()}`,
      onload(response) {
        if (response.status !== 200) {
          console.error(
            `${LOG_PREFIX} Failed to load preview script (HTTP ${response.status} ${response.statusText})`,
            `\n${LOG_PREFIX} Expected: ${previewUrl}`,
            `\n${LOG_PREFIX} Is watch_js.py running?`
          );
          return;
        }

        try {
          GM_addElement("script", {
            textContent: response.responseText,
            type: "text/javascript",
          });
          console.log(`${LOG_PREFIX} Loaded preview script: ${previewUrl}`);
        } catch (error) {
          console.error(`${LOG_PREFIX} Failed to inject preview script:`, error);
        }
      },
      onerror(error) {
        console.error(
          `${LOG_PREFIX} Network error while loading preview script.`,
          error,
          `\n${LOG_PREFIX} Is watch_js.py running on port ${PREVIEW_PORT}?`
        );
      },
      ontimeout() {
        console.error(
          `${LOG_PREFIX} Timed out loading preview script.`,
          `\n${LOG_PREFIX} Is watch_js.py running on port ${PREVIEW_PORT}?`
        );
      },
    });
  }

  // Tampermonkey's window !== the page window. CMS JS runs in page context where
  // jQuery exists; check unsafeWindow.jQuery (not $ — HL sites often use noConflict).
  function pageWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  function whenCmsReady(callback) {
    const page = pageWindow();
    const deadline = Date.now() + 3000;

    (function poll() {
      if (typeof page.jQuery === "function") {
        callback();
        return;
      }
      if (Date.now() < deadline) {
        setTimeout(poll, 100);
        return;
      }
      callback();
    })();
  }

  whenCmsReady(loadPreviewScript);
})();
