import figlet from "figlet";
import chalk from "chalk";
import { join } from "node:path";
import { getLogoGradient, interpolateGradient, getTheme } from "./theme";

// Pre-load font. Falls back gracefully if font file is missing.
let fontLoaded = false;
try {
  const fontDir = join(import.meta.dirname, "..", "fonts");
  figlet.defaults({ fontPath: fontDir });
  figlet.textSync("Test", { font: "Slant", width: 10 });
  fontLoaded = true;
} catch {
  // Font not available — fall back to simple logo below
}

const FALLBACK_LOGO = [
  "  ╦ ╦┬┌┐┌┌┬┐┌─┐┬─┐╔╦╗┌─┐┬─┐┌┐┌┬┌┐┌┌─┐",
  "  ║║║││││ │ ├┤ ├┬┘║║║│ │├┬┘││││││││ ┬",
  "  ╚╩╝┴┘└┘ ┴ └─┘┴└─╩ ╩└─┘┴└─┘└┘┴┘└┘└─┘",
];

// Cache
const logoCache = new Map<
  string,
  { lines: string[]; colors: ((s: string) => string)[]; preColored?: boolean }
>();

function getLines(): string[] {
  if (!fontLoaded) return FALLBACK_LOGO;
  const raw =
    figlet.textSync("WinterMorning", { font: "Slant", width: 80 }) ?? "";
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  return lines.length > 0 ? lines : FALLBACK_LOGO;
}

// ── Rainbow: per-character HSL cycling (chalk v5 has no .hsl) ──
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rainbowColor(charIndex: number, totalChars: number) {
  const hue = (charIndex / totalChars) * 360;
  const [r, g, b] = hslToRgb(hue, 1, 0.6);
  return chalk.rgb(r, g, b);
}

function buildRainbowLogo(): {
  lines: string[];
  colors: ((s: string) => string)[];
  preColored: boolean;
} {
  const rawLines = getLines();

  // Count total visible characters across all lines
  let totalChars = 0;
  for (const line of rawLines) {
    for (const ch of line) {
      if (ch !== " ") totalChars++;
    }
  }
  if (totalChars === 0) totalChars = 1;

  // Pre-color each line character-by-character
  let charIdx = 0;
  const preColoredLines: string[] = [];
  for (const line of rawLines) {
    let colored = "";
    for (const ch of line) {
      if (ch === " ") {
        colored += " ";
      } else {
        colored += rainbowColor(charIdx, totalChars)(ch);
        charIdx++;
      }
    }
    preColoredLines.push(colored);
  }

  return {
    lines: preColoredLines,
    colors: [],
    preColored: true,
  };
}

// ── Prism: 2D diagonal wave color mapping ──
// hue = f(row, col) creating diagonal spectral bands
function buildPrismLogo(): {
  lines: string[];
  colors: ((s: string) => string)[];
  preColored: boolean;
} {
  const rawLines = getLines();
  const rows = rawLines.length;

  // Find max column for normalization
  let maxCol = 0;
  for (const line of rawLines) {
    if (line.length > maxCol) maxCol = line.length;
  }
  if (maxCol === 0) maxCol = 1;

  const preColoredLines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let colored = "";
    const line = rawLines[row]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]!;
      if (ch === " ") {
        colored += " ";
      } else {
        // Diagonal wave: row and col both contribute to hue
        // Creates sloping rainbow bands
        const h = ((row * 2.3 + col) / (rows + maxCol)) * 360;
        const [r, g, b] = hslToRgb(h % 360, 1, 0.65);
        colored += chalk.rgb(r, g, b)(ch);
      }
    }
    preColoredLines.push(colored);
  }

  return { lines: preColoredLines, colors: [], preColored: true };
}

export function getLogo(): {
  lines: string[];
  colors: ((s: string) => string)[];
  preColored?: boolean;
} {
  const theme = getTheme();
  const cached = logoCache.get(theme);
  if (cached) return cached;

  if (theme === "rainbow") {
    const result = buildRainbowLogo();
    logoCache.set(theme, result);
    return result;
  }

  if (theme === "prism" || theme === "voltron-prism") {
    const result = buildPrismLogo();
    logoCache.set(theme, result);
    return result;
  }

  const lines = getLines();
  const stops = getLogoGradient();
  const colors = lines.map((_, i) => {
    const t = lines.length > 1 ? i / (lines.length - 1) : 0;
    const fn = interpolateGradient(stops, t);
    return (s: string) => fn(s);
  });

  const result = { lines, colors, preColored: false };
  logoCache.set(theme, result);
  return result;
}

export function clearLogoCache(): void {
  logoCache.clear();
}
