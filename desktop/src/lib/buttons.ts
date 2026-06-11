/** Shared button class names — pair with `btnDisabled` when inactive. */

const base = "ui-btn";

export const btnDisabled = "pointer-events-none opacity-40";

export const btnNeutralXs = `${base} ui-btn-neutral ui-btn-xs`;
export const btnNeutralSm = `${base} ui-btn-neutral ui-btn-sm`;
export const btnNeutralMd = `${base} ui-btn-neutral ui-btn-md`;

export const btnNeutralBlock = `${base} ui-btn-neutral ui-btn-md relative w-full`;
export const btnNeutralBlockLeft = `${base} ui-btn-neutral ui-btn-md w-full justify-start gap-2 text-left`;

export const btnActiveBlock = `${base} ui-btn-active ui-btn-md relative w-full font-semibold`;

export const btnPrimaryMd = `${base} ui-btn-primary ui-btn-md font-semibold`;
export const btnAccentMd = `${base} ui-btn-accent ui-btn-md`;

export const btnDangerBlock = `${base} ui-btn-danger ui-btn-md relative w-full`;
export const btnRestartingBlock = `${base} ui-btn-restarting ui-btn-md relative w-full font-semibold`;
export const btnGhostSm = `${base} ui-btn-ghost ui-btn-sm rounded-full`;
/** Ghost pill — same as pip install in Diagnostics. */
export const btnToolbarSm = `${btnGhostSm} tracking-wide`;
export const btnIcon = `${base} ui-btn-neutral ui-btn-icon`;

export const btnLink = "ui-btn-link font-medium";

export const btnClose = `${base} ui-btn-ghost ui-btn-icon theme-text-muted absolute right-3 top-3 rounded-full`;
