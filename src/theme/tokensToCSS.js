/**
 * tokensToCSS — Generates CSS custom properties from design tokens.
 *
 * This module is the single bridge between tokens.js (JS source of truth)
 * and the CSS custom-property layer consumed by components.
 *
 * It is imported by the Vite plugin (cssTokensPlugin in vite.config.js)
 * so that `variables.css` is generated at build/dev time — no manual
 * synchronisation needed.
 *
 * @module tokensToCSS
 */

/* ── helpers ────────────────────────────────────────────────── */

/** Convert camelCase → kebab-case: "bgElevated" → "bg-elevated" */
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Build CSS declaration lines from a { varName: value } map.
 * @param {Record<string,string>} vars
 * @param {string} indent
 * @returns {string}
 */
function cssBlock(vars, indent = '  ') {
  return Object.entries(vars)
    .map(([prop, val]) => `${indent}--${prop}: ${val};`)
    .join('\n');
}

/**
 * Convert a flat token object to `{ "color-<kebab-key>": value }`.
 * @param {Record<string,string>} obj   e.g. `colors.dark`
 * @param {string} prefix               CSS var prefix (default `"color"`)
 */
function colorVars(obj, prefix = 'color') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[`${prefix}-${camelToKebab(key)}`] = value;
  }
  return result;
}

/* ── main generator ─────────────────────────────────────────── */

/**
 * Generate a complete CSS string (reset + custom properties) from
 * the design-tokens object exported by `tokens.js`.
 *
 * @param {import('./tokens').default} tokens
 * @returns {string} Valid CSS ready to inject or write to a file.
 */
export function tokensToCSS(tokens) {
  const { colors, fonts, layout, transitions = {} } = tokens;

  /* ── :root — dark mode (app default) ────────────────────── */
  const rootVars = {
    /* Brand */
    ...colorVars(colors.brand),

    /* Semantic surfaces / text / borders (dark) */
    ...colorVars(colors.dark),
  };

  /* Difficulty badges — dark */
  for (const [level, modes] of Object.entries(colors.difficulty)) {
    for (const [prop, val] of Object.entries(modes.dark)) {
      rootVars[`color-diff-${level}-${prop}`] = val;
    }
  }

  /* Route colours (map) — mode-independent */
  Object.assign(rootVars, {
    'color-route-full': colors.route.full,
    'color-route-line': colors.route.animatedLine,
    'color-route-head': colors.route.head,
  });

  /* Typography */
  rootVars['font-family'] = fonts.family;
  rootVars['font-mono'] = fonts.mono;

  /* Layout */
  Object.assign(rootVars, {
    'max-width': layout.maxWidth,
    'radius': layout.borderRadius,
    'radius-card': layout.borderRadiusCard,
    'radius-badge': layout.borderRadiusBadge,
    'radius-btn': layout.borderRadiusBtn,
    'z-overlay': layout.zIndexOverlay,
    'z-header': layout.zIndexHeader,
    'spacing-overlay-bottom': layout.spacingOverlayBottom,
  });

  /* Transitions */
  rootVars['transition-theme'] = transitions.theme
    || 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';

  /* ── .light-theme ───────────────────────────────────────── */
  const lightVars = {
    ...colorVars(colors.light),
  };

  /* Difficulty badges — light */
  for (const [level, modes] of Object.entries(colors.difficulty)) {
    for (const [prop, val] of Object.entries(modes.light)) {
      lightVars[`color-diff-${level}-${prop}`] = val;
    }
  }

  /* ── Assemble ───────────────────────────────────────────── */
  return [
    '/*  ──────────────────────────────────────────────────────────',
    ' *  Global CSS Custom Properties — auto-generated from tokens.js',
    ' *',
    ' *  DO NOT EDIT — changes here will be overwritten at build time.',
    ' *  Modify src/theme/tokens.js instead.',
    ' *',
    ' *  How it works:',
    ' *    :root          → dark-mode defaults (the app default)',
    ' *    .light-theme   → light-mode overrides',
    ' *  ────────────────────────────────────────────────────────── */',
    '',
    '/* ── Reset ─────────────────────────────────────────────────── */',
    '*,',
    '*::before,',
    '*::after {',
    '  box-sizing: border-box;',
    '}',
    '',
    'body {',
    '  margin: 0;',
    '}',
    '',
    '/* ── Dark mode (default) ───────────────────────────────────── */',
    ':root {',
    cssBlock(rootVars),
    '}',
    '',
    '/* ── Light mode ────────────────────────────────────────────── */',
    '.light-theme {',
    cssBlock(lightVars),
    '}',
    '',
  ].join('\n');
}
