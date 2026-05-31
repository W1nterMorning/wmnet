import chalk from "chalk";

export interface ColorScheme {
  brand: chalk.Chalk;
  brandDim: chalk.Chalk;
  success: chalk.Chalk;
  error: chalk.Chalk;
  warn: chalk.Chalk;
  text: chalk.Chalk;
  textWarm: chalk.Chalk;
  textCool: chalk.Chalk;
  muted: chalk.Chalk;
  dim: chalk.Chalk;
  divider: chalk.Chalk;
  badgeBg: chalk.Chalk;
}

const schemes: Record<string, ColorScheme> = {
  cyan: {
    brand: chalk.hex("#2CCED2"),
    brandDim: chalk.hex("#1A8A8E"),
    success: chalk.hex("#4ADE80"),
    error: chalk.hex("#F87171"),
    warn: chalk.hex("#FACC15"),
    text: chalk.hex("#E2E8F0"),
    textWarm: chalk.hex("#F1F5F9"),
    textCool: chalk.hex("#CBD5E1"),
    muted: chalk.hex("#94A3B8"),
    dim: chalk.hex("#64748B"),
    divider: chalk.hex("#334155"),
    badgeBg: chalk.hex("#1A3A3E"),
  },
  sunset: {
    brand: chalk.hex("#F59E0B"),
    brandDim: chalk.hex("#B45309"),
    success: chalk.hex("#A3E635"),
    error: chalk.hex("#F87171"),
    warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FEF3C7"),
    textWarm: chalk.hex("#FFFBEB"),
    textCool: chalk.hex("#D6D3D1"),
    muted: chalk.hex("#A8A29E"),
    dim: chalk.hex("#78716C"),
    divider: chalk.hex("#44403C"),
    badgeBg: chalk.hex("#451A03"),
  },
  forest: {
    brand: chalk.hex("#22C55E"),
    brandDim: chalk.hex("#15803D"),
    success: chalk.hex("#4ADE80"),
    error: chalk.hex("#FCA5A5"),
    warn: chalk.hex("#FDE047"),
    text: chalk.hex("#DCFCE7"),
    textWarm: chalk.hex("#F0FFF4"),
    textCool: chalk.hex("#BBF7D0"),
    muted: chalk.hex("#86EFAC"),
    dim: chalk.hex("#4ADE80"),
    divider: chalk.hex("#14532D"),
    badgeBg: chalk.hex("#052E16"),
  },
  purple: {
    brand: chalk.hex("#A855F7"),
    brandDim: chalk.hex("#7E22CE"),
    success: chalk.hex("#A3E635"),
    error: chalk.hex("#FCA5A5"),
    warn: chalk.hex("#FDE047"),
    text: chalk.hex("#F3E8FF"),
    textWarm: chalk.hex("#FAF5FF"),
    textCool: chalk.hex("#E9D5FF"),
    muted: chalk.hex("#C084FC"),
    dim: chalk.hex("#A855F7"),
    divider: chalk.hex("#4C1D95"),
    badgeBg: chalk.hex("#2E1065"),
  },
  rose: {
    brand: chalk.hex("#E11D48"),
    brandDim: chalk.hex("#9F1239"),
    success: chalk.hex("#4ADE80"),
    error: chalk.hex("#FB7185"),
    warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FFF1F2"),
    textWarm: chalk.hex("#FFF5F5"),
    textCool: chalk.hex("#FECDD3"),
    muted: chalk.hex("#FDA4AF"),
    dim: chalk.hex("#FB7185"),
    divider: chalk.hex("#881337"),
    badgeBg: chalk.hex("#4C0519"),
  },
  monochrome: {
    brand: chalk.hex("#A1A1AA"),
    brandDim: chalk.hex("#71717A"),
    success: chalk.hex("#A3A3A3"),
    error: chalk.hex("#F87171"),
    warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FAFAFA"),
    textWarm: chalk.hex("#FFFFFF"),
    textCool: chalk.hex("#D4D4D8"),
    muted: chalk.hex("#A1A1AA"),
    dim: chalk.hex("#71717A"),
    divider: chalk.hex("#3F3F46"),
    badgeBg: chalk.hex("#27272A"),
  },
};

let activeTheme = "cyan";

export function getColors(): ColorScheme {
  return schemes[activeTheme] ?? schemes.cyan!;
}

export function setTheme(name: string): boolean {
  if (schemes[name]) {
    activeTheme = name;
    return true;
  }
  return false;
}

export function getTheme(): string {
  return activeTheme;
}

export const logoGradientStops = [
  { pos: 0.0, r: 0xe0, g: 0xf7, b: 0xfa },
  { pos: 0.33, r: 0x4f, g: 0xc3, b: 0xf7 },
  { pos: 0.66, r: 0x02, g: 0x88, b: 0xd1 },
  { pos: 1.0, r: 0x01, g: 0x57, b: 0x9b },
];

export function interpolateGradient(
  stops: { pos: number; r: number; g: number; b: number }[],
  t: number,
): chalk.Chalk {
  let lower = stops[0]!;
  let upper = stops[stops.length - 1]!;
  for (let j = 0; j < stops.length - 1; j++) {
    if (t >= stops[j]!.pos && t <= stops[j + 1]!.pos) {
      lower = stops[j]!;
      upper = stops[j + 1]!;
      break;
    }
  }
  const range = upper.pos - lower.pos || 1;
  const f = Math.max(0, Math.min(1, (t - lower.pos) / range));
  const r = Math.round(lower.r + (upper.r - lower.r) * f);
  const g = Math.round(lower.g + (upper.g - lower.g) * f);
  const b = Math.round(lower.b + (upper.b - lower.b) * f);
  return chalk.rgb(r, g, b);
}
