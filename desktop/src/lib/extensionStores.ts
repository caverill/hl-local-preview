const STORES = {
  stylus: {
    chrome: "https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne",
    firefox: "https://addons.mozilla.org/en-CA/firefox/addon/styl-us/",
    default: "https://github.com/openstyles/stylus",
  },
  tampermonkey: {
    chrome: "https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en",
    firefox: "https://addons.mozilla.org/en-CA/firefox/addon/tampermonkey/",
    default: "https://www.tampermonkey.net/index.php?locale=en",
  },
} as const;

export type ExtensionId = keyof typeof STORES;

export type DetectedBrowser = "chrome" | "firefox" | "other";

export function detectBrowser(): DetectedBrowser {
  const ua = navigator.userAgent;
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|Chromium|Edg|OPR|Brave/i.test(ua)) return "chrome";
  return "other";
}

export function extensionStoreLabel(browser: DetectedBrowser = detectBrowser()): string {
  if (browser === "firefox") return "Firefox Add-ons";
  if (browser === "chrome") return "Chrome Web Store";
  return "official site";
}

export function extensionInstallUrl(
  extension: ExtensionId,
  browser: DetectedBrowser = detectBrowser(),
): string {
  const urls = STORES[extension];
  if (browser === "firefox") return urls.firefox;
  if (browser === "chrome") return urls.chrome;
  return urls.default;
}
