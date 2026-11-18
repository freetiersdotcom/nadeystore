// src/themes.ts
// The colours and fonts of the site, by theme. Pick one in src/site.config.ts:  theme: 'emerald' | 'ocean' | 'terracotta'
// Each colour is "R G B" (it is used as rgb(R G B) in CSS). To make a new theme, copy one block, rename it, add its name to
// ThemeName in src/site.config.ts and give it a label. Text and button colours were checked for readable contrast (WCAG AA).
import type { ThemeName } from '~/site.config';

interface Palette {
  primary: string; // buttons, links
  secondary: string; // darker shade of the primary
  accent: string; // small accent text (must stay readable on the page background)
  gold: string; // decoration only (borders, dividers, highlights)
  heading: string;
  text: string;
  bg: string; // page background
}
interface Theme {
  label: { fr: string; en: string };
  fonts: { sans: string; serif: string; heading: string };
  light: Palette;
  dark: Palette;
  /** Page background in dark mode */
  darkBg: string;
}

const INTER = "'Inter Variable'";
const SERIF = "Georgia, 'Times New Roman', serif";

export const themes: Record<ThemeName, Theme> = {
  // Deep emerald, gold and cream: the original look of the site.
  emerald: {
    label: { fr: 'Émeraude et or', en: 'Emerald and gold' },
    fonts: { sans: INTER, serif: INTER, heading: INTER },
    light: {
      primary: '15 107 75',
      secondary: '11 82 56',
      accent: '138 109 31',
      gold: '200 166 70',
      heading: '43 43 43',
      text: '43 43 43',
      bg: '248 246 240',
    },
    dark: {
      primary: '27 127 90',
      secondary: '15 107 75',
      accent: '200 166 70',
      gold: '200 166 70',
      heading: '246 248 246',
      text: '232 238 233',
      bg: '11 22 18',
    },
    darkBg: '11 22 18',
  },
  // Deep sea blue with a warm amber accent: clean, clinical, trustworthy.
  ocean: {
    label: { fr: 'Bleu océan', en: 'Ocean blue' },
    fonts: { sans: INTER, serif: INTER, heading: INTER },
    light: {
      primary: '14 116 144',
      secondary: '21 94 117',
      accent: '180 83 9',
      gold: '245 158 11',
      heading: '20 36 46',
      text: '20 36 46',
      bg: '244 248 250',
    },
    dark: {
      primary: '18 132 162',
      secondary: '14 116 144',
      accent: '251 191 36',
      gold: '245 158 11',
      heading: '241 247 250',
      text: '228 238 243',
      bg: '8 20 28',
    },
    darkBg: '8 20 28',
  },
  // Warm clay, olive and cream with a serif heading font: craft, natural, soft.
  terracotta: {
    label: { fr: 'Terre cuite', en: 'Terracotta' },
    fonts: { sans: INTER, serif: SERIF, heading: SERIF },
    light: {
      primary: '166 72 42',
      secondary: '128 52 28',
      accent: '92 107 62',
      gold: '214 160 90',
      heading: '52 38 32',
      text: '52 38 32',
      bg: '251 246 240',
    },
    dark: {
      primary: '182 84 52',
      secondary: '166 72 42',
      accent: '224 168 96',
      gold: '214 160 90',
      heading: '250 244 238',
      text: '244 236 230',
      bg: '26 18 14',
    },
    darkBg: '26 18 14',
  },
};

export function themeCss(name: ThemeName): string {
  const t = themes[name] ?? themes.emerald;
  const fonts = (indent: string) =>
    `${indent}--aw-font-sans: ${t.fonts.sans};\n${indent}--aw-font-serif: ${t.fonts.serif};\n${indent}--aw-font-heading: ${t.fonts.heading};`;
  const colors = (p: Palette, muted: string) =>
    [
      `--aw-color-primary: rgb(${p.primary});`,
      `--aw-color-secondary: rgb(${p.secondary});`,
      `--aw-color-accent: rgb(${p.accent});`,
      `--aw-color-gold: rgb(${p.gold});`,
      '',
      `--aw-color-text-heading: rgb(${p.heading});`,
      `--aw-color-text-default: rgb(${p.text});`,
      `--aw-color-text-muted: rgb(${p.text} / ${muted});`,
      `--aw-color-bg-page: rgb(${p.bg});`,
    ]
      .map((l) => (l ? `    ${l}` : l))
      .join('\n');
  return `
  :root {
${fonts('    ')}

${colors(t.light, '70%')}

    --aw-color-bg-page-dark: rgb(${t.darkBg});

    ::selection {
      background-color: rgb(${t.light.gold} / 35%);
    }
  }

  .dark {
${fonts('    ')}

${colors(t.dark, '66%')}

    ::selection {
      background-color: black;
      color: snow;
    }
  }
`;
}
