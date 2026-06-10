// ==UserScript==
// @name           hl-js-local-preview-loader
// @namespace      higherlogic-local-dev
// @version        1.2.1
// @description    Stable Tampermonkey loader for local JS preview development. Installs once; loads the generated preview script from your local watcher.
// @author         HL Local Preview
//
// Match the same pages you target in .env.local (SITE_URL). Add or adjust @match lines as needed.
// @match          https://econversetest.connectedcommunity.org/caileesandbox/*
//
// Required for fetching js-local-preview.js from the local preview server (:5500).
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
 * Auto refresh on save: enabled via preview/js-local-preview.config.json from the watcher.
 * Set JS_AUTO_REFRESH=false in .env.local to disable. Polls for preview changes and
 * reloads the page — never navigates away from your dev site.
 */
(function () {
  "use strict";

  const PREVIEW_HOST = "127.0.0.1";
  const PREVIEW_PORT = 5500;
  const PREVIEW_SCRIPT = "preview/js-local-preview.js";
  const PREVIEW_CONFIG = "preview/js-local-preview.config.json";
  const LOG_PREFIX = "[hl-js-local-preview:loader]";
  const previewUrl = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/${PREVIEW_SCRIPT}`;
  const configUrl = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/${PREVIEW_CONFIG}`;

  let lastPreviewContent = null;
  let autoRefreshTimer = null;
  let pollErrors = 0;
  const MAX_POLL_ERRORS = 3;

  function pageWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  function fetchText(url, callback) {
    GM_xmlhttpRequest({
      method: "GET",
      url: `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`,
      onload(response) {
        if (response.status === 200) {
          callback(null, response.responseText);
          return;
        }
        callback(new Error(`HTTP ${response.status} ${response.statusText}`));
      },
      onerror(error) {
        callback(error || new Error("network error"));
      },
      ontimeout() {
        callback(new Error("timeout"));
      },
    });
  }

  function injectPreviewScript(source) {
    GM_addElement("script", {
      textContent: source,
      type: "text/javascript",
    });
    lastPreviewContent = source;
    console.log(`${LOG_PREFIX} Loaded preview script: ${previewUrl}`);
  }

  function loadPreviewScript(callback) {
    fetchText(previewUrl, (error, source) => {
      if (error) {
        console.error(
          `${LOG_PREFIX} Failed to load preview script (${error.message})`,
          `\n${LOG_PREFIX} Expected: ${previewUrl}`,
          `\n${LOG_PREFIX} Is the watcher running?`
        );
        callback(error);
        return;
      }

      try {
        injectPreviewScript(source);
        callback(null);
      } catch (injectError) {
        console.error(`${LOG_PREFIX} Failed to inject preview script:`, injectError);
        callback(injectError);
      }
    });
  }

  function stopAutoRefresh(reason) {
    if (autoRefreshTimer !== null) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
      console.warn(`${LOG_PREFIX} Auto refresh stopped — ${reason}`);
    }
  }

  function startAutoRefresh(settings) {
    if (!settings.autoRefresh || autoRefreshTimer !== null) {
      return;
    }

    const intervalMs = settings.autoRefreshIntervalMs || 500;
    pollErrors = 0;
    console.log(`${LOG_PREFIX} Auto refresh enabled (${intervalMs}ms)`);

    autoRefreshTimer = setInterval(() => {
      fetchText(previewUrl, (error, source) => {
        if (error) {
          pollErrors += 1;
          if (pollErrors >= MAX_POLL_ERRORS) {
            stopAutoRefresh("preview server unreachable");
          }
          return;
        }

        pollErrors = 0;

        if (lastPreviewContent === null || source === lastPreviewContent) {
          return;
        }

        console.log(`${LOG_PREFIX} Preview changed — reloading page`);
        pageWindow().location.reload();
      });
    }, intervalMs);
  }

  function loadConfigAndStart() {
    const fallbackSettings = {
      autoRefresh: false,
      autoRefreshIntervalMs: 500,
    };

    fetchText(configUrl, (error, rawConfig) => {
      const settings = { ...fallbackSettings };

      if (!error) {
        try {
          Object.assign(settings, JSON.parse(rawConfig));
        } catch (parseError) {
          console.warn(`${LOG_PREFIX} Invalid preview config — using defaults`, parseError);
        }
      }

      loadPreviewScript((loadError) => {
        if (!loadError) {
          startAutoRefresh(settings);
        }
      });
    });
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

  whenCmsReady(loadConfigAndStart);
})();
