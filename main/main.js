/**
 * CMS custom JavaScript — edit here and upload to production when ready.
 *
 * Local preview (Tampermonkey): install tampermonkey-loader.user.js from Quick Links.
 * Filter DevTools with MAIN_PREFIX to see only this script's logs. If preview stops
 * updating, restart the watcher.
 */

const MAIN_PREFIX = "[hl-js-local-preview:main]";

$(function () {
  console.log(MAIN_PREFIX + " Main script executed successfully in $(function)");
});
