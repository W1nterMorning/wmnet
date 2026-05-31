import chalk from "chalk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChalkFn = any;

export interface ColorScheme {
  brand: ChalkFn;
  brandDim: ChalkFn;
  success: ChalkFn;
  error: ChalkFn;
  warn: ChalkFn;
  text: ChalkFn;
  textWarm: ChalkFn;
  textCool: ChalkFn;
  muted: ChalkFn;
  dim: ChalkFn;
  divider: ChalkFn;
  badgeBg: ChalkFn;
}

interface GradientStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

const schemes: Record<string, ColorScheme> = {
  cyan: {
    brand: chalk.hex("#2CCED2"), brandDim: chalk.hex("#1A8A8E"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#F87171"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#E2E8F0"), textWarm: chalk.hex("#F1F5F9"), textCool: chalk.hex("#CBD5E1"),
    muted: chalk.hex("#94A3B8"), dim: chalk.hex("#64748B"), divider: chalk.hex("#334155"),
    badgeBg: chalk.hex("#1A3A3E"),
  },
  sunset: {
    brand: chalk.hex("#F59E0B"), brandDim: chalk.hex("#B45309"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#F87171"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FEF3C7"), textWarm: chalk.hex("#FFFBEB"), textCool: chalk.hex("#D6D3D1"),
    muted: chalk.hex("#A8A29E"), dim: chalk.hex("#78716C"), divider: chalk.hex("#44403C"),
    badgeBg: chalk.hex("#451A03"),
  },
  forest: {
    brand: chalk.hex("#22C55E"), brandDim: chalk.hex("#15803D"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#DCFCE7"), textWarm: chalk.hex("#F0FFF4"), textCool: chalk.hex("#BBF7D0"),
    muted: chalk.hex("#86EFAC"), dim: chalk.hex("#4ADE80"), divider: chalk.hex("#14532D"),
    badgeBg: chalk.hex("#052E16"),
  },
  purple: {
    brand: chalk.hex("#A855F7"), brandDim: chalk.hex("#7E22CE"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#F3E8FF"), textWarm: chalk.hex("#FAF5FF"), textCool: chalk.hex("#E9D5FF"),
    muted: chalk.hex("#C084FC"), dim: chalk.hex("#A855F7"), divider: chalk.hex("#4C1D95"),
    badgeBg: chalk.hex("#2E1065"),
  },
  rose: {
    brand: chalk.hex("#E11D48"), brandDim: chalk.hex("#9F1239"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#FB7185"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FFF1F2"), textWarm: chalk.hex("#FFF5F5"), textCool: chalk.hex("#FECDD3"),
    muted: chalk.hex("#FDA4AF"), dim: chalk.hex("#FB7185"), divider: chalk.hex("#881337"),
    badgeBg: chalk.hex("#4C0519"),
  },
  monochrome: {
    brand: chalk.hex("#A1A1AA"), brandDim: chalk.hex("#71717A"),
    success: chalk.hex("#A3A3A3"), error: chalk.hex("#F87171"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FAFAFA"), textWarm: chalk.hex("#FFFFFF"), textCool: chalk.hex("#D4D4D8"),
    muted: chalk.hex("#A1A1AA"), dim: chalk.hex("#71717A"), divider: chalk.hex("#3F3F46"),
    badgeBg: chalk.hex("#27272A"),
  },
  // ── New themes ──
  aurora: {
    brand: chalk.hex("#A78BFA"), brandDim: chalk.hex("#7C3AED"),
    success: chalk.hex("#6EE7B7"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FCD34D"),
    text: chalk.hex("#EDE9FE"), textWarm: chalk.hex("#F5F3FF"), textCool: chalk.hex("#DDD6FE"),
    muted: chalk.hex("#C4B5FD"), dim: chalk.hex("#8B5CF6"), divider: chalk.hex("#4C1D95"),
    badgeBg: chalk.hex("#3B0764"),
  },
  ocean: {
    brand: chalk.hex("#06B6D4"), brandDim: chalk.hex("#0E7490"),
    success: chalk.hex("#34D399"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#ECFEFF"), textWarm: chalk.hex("#F0FDFA"), textCool: chalk.hex("#A5F3FC"),
    muted: chalk.hex("#67E8F9"), dim: chalk.hex("#22D3EE"), divider: chalk.hex("#164E63"),
    badgeBg: chalk.hex("#042F2E"),
  },
  sakura: {
    brand: chalk.hex("#F472B6"), brandDim: chalk.hex("#BE185D"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#FDF2F8"), textWarm: chalk.hex("#FFF5F9"), textCool: chalk.hex("#FBCFE8"),
    muted: chalk.hex("#F9A8D4"), dim: chalk.hex("#EC4899"), divider: chalk.hex("#831843"),
    badgeBg: chalk.hex("#4C0519"),
  },
  neon: {
    brand: chalk.hex("#22C55E"), brandDim: chalk.hex("#15803D"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#EF4444"), warn: chalk.hex("#EAB308"),
    text: chalk.hex("#D9F99D"), textWarm: chalk.hex("#F7FEE7"), textCool: chalk.hex("#BEF264"),
    muted: chalk.hex("#84CC16"), dim: chalk.hex("#65A30D"), divider: chalk.hex("#365314"),
    badgeBg: chalk.hex("#1A2E05"),
  },
  matrix: {
    brand: chalk.hex("#22C55E"), brandDim: chalk.hex("#15803D"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#F87171"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#D1FAE5"), textWarm: chalk.hex("#ECFDF5"), textCool: chalk.hex("#A7F3D0"),
    muted: chalk.hex("#6EE7B7"), dim: chalk.hex("#34D399"), divider: chalk.hex("#064E3B"),
    badgeBg: chalk.hex("#022C22"),
  },
  lava: {
    brand: chalk.hex("#F97316"), brandDim: chalk.hex("#C2410C"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FFF7ED"), textWarm: chalk.hex("#FFFBF5"), textCool: chalk.hex("#FED7AA"),
    muted: chalk.hex("#FDBA74"), dim: chalk.hex("#FB923C"), divider: chalk.hex("#7C2D12"),
    badgeBg: chalk.hex("#431407"),
  },
  midnight: {
    brand: chalk.hex("#818CF8"), brandDim: chalk.hex("#4F46E5"),
    success: chalk.hex("#6EE7B7"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#E0E7FF"), textWarm: chalk.hex("#EEF2FF"), textCool: chalk.hex("#C7D2FE"),
    muted: chalk.hex("#A5B4FC"), dim: chalk.hex("#818CF8"), divider: chalk.hex("#312E81"),
    badgeBg: chalk.hex("#1E1B4B"),
  },
  "cotton-candy": {
    brand: chalk.hex("#F472B6"), brandDim: chalk.hex("#DB2777"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#FCE7F3"), textWarm: chalk.hex("#FDF2F8"), textCool: chalk.hex("#FBCFE8"),
    muted: chalk.hex("#F9A8D4"), dim: chalk.hex("#EC4899"), divider: chalk.hex("#9D174D"),
    badgeBg: chalk.hex("#500724"),
  },
  sunflare: {
    brand: chalk.hex("#FACC15"), brandDim: chalk.hex("#CA8A04"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#F87171"), warn: chalk.hex("#FB923C"),
    text: chalk.hex("#FEFCE8"), textWarm: chalk.hex("#FFFDF0"), textCool: chalk.hex("#FEF08A"),
    muted: chalk.hex("#FDE047"), dim: chalk.hex("#FACC15"), divider: chalk.hex("#713F12"),
    badgeBg: chalk.hex("#422006"),
  },
  mint: {
    brand: chalk.hex("#2DD4BF"), brandDim: chalk.hex("#0D9488"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#F0FDFA"), textWarm: chalk.hex("#F5FFFD"), textCool: chalk.hex("#99F6E4"),
    muted: chalk.hex("#5EEAD4"), dim: chalk.hex("#2DD4BF"), divider: chalk.hex("#0F766E"),
    badgeBg: chalk.hex("#042F2E"),
  },
  tricolor: {
    brand: chalk.hex("#3B82F6"), brandDim: chalk.hex("#1D4ED8"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#F87171"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#EFF6FF"), textWarm: chalk.hex("#F8FAFC"), textCool: chalk.hex("#BFDBFE"),
    muted: chalk.hex("#93C5FD"), dim: chalk.hex("#60A5FA"), divider: chalk.hex("#1E3A5F"),
    badgeBg: chalk.hex("#172554"),
  },
  galaxy: {
    brand: chalk.hex("#A855F7"), brandDim: chalk.hex("#7E22CE"),
    success: chalk.hex("#6EE7B7"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#F3E8FF"), textWarm: chalk.hex("#FAF5FF"), textCool: chalk.hex("#DDD6FE"),
    muted: chalk.hex("#C084FC"), dim: chalk.hex("#A78BFA"), divider: chalk.hex("#4C1D95"),
    badgeBg: chalk.hex("#2E1065"),
  },
  candy: {
    brand: chalk.hex("#F472B6"), brandDim: chalk.hex("#DB2777"),
    success: chalk.hex("#A3E635"), error: chalk.hex("#FCA5A5"), warn: chalk.hex("#FDE047"),
    text: chalk.hex("#FDF2F8"), textWarm: chalk.hex("#FFF5F9"), textCool: chalk.hex("#FCE7F3"),
    muted: chalk.hex("#F9A8D4"), dim: chalk.hex("#EC4899"), divider: chalk.hex("#9D174D"),
    badgeBg: chalk.hex("#500724"),
  },
  gundam: {
    brand: chalk.hex("#3B82F6"), brandDim: chalk.hex("#60A5FA"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#FFFFFF"), textWarm: chalk.hex("#FACC15"), textCool: chalk.hex("#93C5FD"),
    muted: chalk.hex("#93C5FD"), dim: chalk.hex("#60A5FA"), divider: chalk.hex("#FACC15"),
    badgeBg: chalk.hex("#EF4444"),
  },
  "eva-01": {
    brand: chalk.hex("#A855F7"), brandDim: chalk.hex("#7E22CE"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#F97316"),
    text: chalk.hex("#FAF5FF"), textWarm: chalk.hex("#22C55E"), textCool: chalk.hex("#D8B4FE"),
    muted: chalk.hex("#C084FC"), dim: chalk.hex("#A855F7"), divider: chalk.hex("#22C55E"),
    badgeBg: chalk.hex("#F97316"),
  },
  voltron: {
    brand: chalk.hex("#EF4444"), brandDim: chalk.hex("#DC2626"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#F87171"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#FEF2F2"), textWarm: chalk.hex("#FACC15"), textCool: chalk.hex("#3B82F6"),
    muted: chalk.hex("#FCA5A5"), dim: chalk.hex("#F87171"), divider: chalk.hex("#3B82F6"),
    badgeBg: chalk.hex("#22C55E"),
  },
  cyber: {
    brand: chalk.hex("#06B6D4"), brandDim: chalk.hex("#EC4899"),
    success: chalk.hex("#22C55E"), error: chalk.hex("#F43F5E"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#F0FDFA"), textWarm: chalk.hex("#EC4899"), textCool: chalk.hex("#67E8F9"),
    muted: chalk.hex("#22D3EE"), dim: chalk.hex("#F43F5E"), divider: chalk.hex("#EC4899"),
    badgeBg: chalk.hex("#A855F7"),
  },
  joker: {
    brand: chalk.hex("#A855F7"), brandDim: chalk.hex("#7E22CE"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#F5F3FF"), textWarm: chalk.hex("#22C55E"), textCool: chalk.hex("#D8B4FE"),
    muted: chalk.hex("#C084FC"), dim: chalk.hex("#A855F7"), divider: chalk.hex("#22C55E"),
    badgeBg: chalk.hex("#EAB308"),
  },
  frost: {
    brand: chalk.hex("#3B82F6"), brandDim: chalk.hex("#2563EB"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#F59E0B"),
    text: chalk.hex("#FFFFFF"), textWarm: chalk.hex("#06B6D4"), textCool: chalk.hex("#7DD3FC"),
    muted: chalk.hex("#60A5FA"), dim: chalk.hex("#38BDF8"), divider: chalk.hex("#F59E0B"),
    badgeBg: chalk.hex("#1E40AF"),
  },
  inferno: {
    brand: chalk.hex("#EF4444"), brandDim: chalk.hex("#DC2626"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#7F1D1D"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FEF2F2"), textWarm: chalk.hex("#FBBF24"), textCool: chalk.hex("#FCA5A5"),
    muted: chalk.hex("#F87171"), dim: chalk.hex("#EF4444"), divider: chalk.hex("#FBBF24"),
    badgeBg: chalk.hex("#991B1B"),
  },
  thor: {
    brand: chalk.hex("#3B82F6"), brandDim: chalk.hex("#1D4ED8"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#EFF6FF"), textWarm: chalk.hex("#FACC15"), textCool: chalk.hex("#93C5FD"),
    muted: chalk.hex("#60A5FA"), dim: chalk.hex("#3B82F6"), divider: chalk.hex("#C0C0C0"),
    badgeBg: chalk.hex("#1D4ED8"),
  },
  venom: {
    brand: chalk.hex("#22C55E"), brandDim: chalk.hex("#15803D"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#F0FDF4"), textWarm: chalk.hex("#D8B4FE"), textCool: chalk.hex("#86EFAC"),
    muted: chalk.hex("#4ADE80"), dim: chalk.hex("#22C55E"), divider: chalk.hex("#A855F7"),
    badgeBg: chalk.hex("#1A1A1A"),
  },
  rainbow: {
    brand: chalk.hex("#EC4899"), brandDim: chalk.hex("#DB2777"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FFFFFF"), textWarm: chalk.hex("#FACC15"), textCool: chalk.hex("#93C5FD"),
    muted: chalk.hex("#F472B6"), dim: chalk.hex("#A78BFA"), divider: chalk.hex("#22D3EE"),
    badgeBg: chalk.hex("#A855F7"),
  },
  prism: {
    brand: chalk.hex("#EC4899"), brandDim: chalk.hex("#BE185D"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#EF4444"), warn: chalk.hex("#FBBF24"),
    text: chalk.hex("#FDF2F8"), textWarm: chalk.hex("#22D3EE"), textCool: chalk.hex("#A78BFA"),
    muted: chalk.hex("#F472B6"), dim: chalk.hex("#C084FC"), divider: chalk.hex("#22D3EE"),
    badgeBg: chalk.hex("#BE185D"),
  },
  "voltron-prism": {
    brand: chalk.hex("#EF4444"), brandDim: chalk.hex("#DC2626"),
    success: chalk.hex("#4ADE80"), error: chalk.hex("#F87171"), warn: chalk.hex("#FACC15"),
    text: chalk.hex("#FEF2F2"), textWarm: chalk.hex("#FACC15"), textCool: chalk.hex("#3B82F6"),
    muted: chalk.hex("#FCA5A5"), dim: chalk.hex("#F87171"), divider: chalk.hex("#3B82F6"),
    badgeBg: chalk.hex("#22C55E"),
  },
};

// ── Logo gradients per theme ──
const logoGradients: Record<string, GradientStop[]> = {
  // Rule: every stop must be visible on black terminal (no component < 0x40)
  cyan:   [{ pos:0,r:0xE0,g:0xF7,b:0xFA},{ pos:.33,r:0x67,g:0xE8,b:0xF9},{ pos:.66,r:0x2C,g:0xCE,b:0xD2},{ pos:1,r:0x06,g:0xA5,b:0xCC }],
  sunset: [{ pos:0,r:0xFF,g:0xFB,b:0xEB},{ pos:.33,r:0xFB,g:0xBF,b:0x24},{ pos:.66,r:0xF5,g:0x9E,b:0x0B},{ pos:1,r:0xD9,g:0x77,b:0x06 }],
  forest: [{ pos:0,r:0xF0,g:0xFD,b:0xF4},{ pos:.33,r:0x4A,g:0xDE,b:0x80},{ pos:.66,r:0x22,g:0xC5,b:0x5E},{ pos:1,r:0x16,g:0xA3,b:0x4A }],
  purple: [{ pos:0,r:0xFA,g:0xF5,b:0xFF},{ pos:.33,r:0xC0,g:0x84,b:0xFC},{ pos:.66,r:0xA8,g:0x55,b:0xF7},{ pos:1,r:0x8B,g:0x3D,b:0xD9 }],
  rose:   [{ pos:0,r:0xFF,g:0xF1,b:0xF2},{ pos:.33,r:0xFB,g:0x71,b:0x85},{ pos:.66,r:0xE1,g:0x1D,b:0x48},{ pos:1,r:0xBE,g:0x12,b:0x3D }],
  monochrome:   [{ pos:0,r:0xF4,g:0xF4,b:0xF5},{ pos:.33,r:0xA1,g:0xA1,b:0xAA},{ pos:.66,r:0x71,g:0x71,b:0x7A},{ pos:1,r:0x52,g:0x52,b:0x5B }],
  aurora: [{ pos:0,r:0x67,g:0xE8,b:0xF9},{ pos:.33,r:0xA7,g:0x8B,b:0xFA},{ pos:.66,r:0xF4,g:0x72,b:0xB6},{ pos:1,r:0xFB,g:0xBF,b:0x24 }],
  ocean:  [{ pos:0,r:0x3B,g:0x82,b:0xF6},{ pos:.33,r:0x06,g:0xB6,b:0xD4},{ pos:.66,r:0x22,g:0xD3,b:0xEE},{ pos:1,r:0x67,g:0xE8,b:0xF9 }],
  sakura: [{ pos:0,r:0xFD,g:0xF2,b:0xF8},{ pos:.33,r:0xF4,g:0x72,b:0xB6},{ pos:.66,r:0xEC,g:0x48,b:0x99},{ pos:1,r:0xDB,g:0x27,b:0x77 }],
  neon:         [{ pos:0,r:0x4A,g:0xDE,b:0x80},{ pos:.33,r:0xA3,g:0xE6,b:0x35},{ pos:.66,r:0xFA,g:0xCC,b:0x15},{ pos:1,r:0xF4,g:0x3F,b:0x5E }],
  matrix:       [{ pos:0,r:0xD1,g:0xFA,b:0xE5},{ pos:.33,r:0x4A,g:0xDE,b:0x80},{ pos:.66,r:0x22,g:0xC5,b:0x5E},{ pos:1,r:0x16,g:0xA3,b:0x4A }],
  lava:         [{ pos:0,r:0xFE,g:0xF3,b:0xC7},{ pos:.33,r:0xFB,g:0x92,b:0x3C},{ pos:.66,r:0xEA,g:0x58,b:0x0C},{ pos:1,r:0xDC,g:0x26,b:0x26 }],
  midnight:     [{ pos:0,r:0xC7,g:0xD2,b:0xFE},{ pos:.33,r:0x81,g:0x8C,b:0xF8},{ pos:.66,r:0x63,g:0x66,b:0xF1},{ pos:1,r:0x4F,g:0x46,b:0xE5 }],
  "cotton-candy":[{ pos:0,r:0xFB,g:0xCF,b:0xE8},{ pos:.33,r:0xF4,g:0x72,b:0xB6},{ pos:.66,r:0x81,g:0x8C,b:0xF8},{ pos:1,r:0x67,g:0xE8,b:0xF9 }],
  sunflare:     [{ pos:0,r:0xFE,g:0xF0,b:0x8A},{ pos:.33,r:0xFA,g:0xCC,b:0x15},{ pos:.66,r:0xF5,g:0x9E,b:0x0B},{ pos:1,r:0xEA,g:0x58,b:0x0C }],
  mint:         [{ pos:0,r:0xCC,g:0xFB,b:0xF1},{ pos:.33,r:0x5E,g:0xEA,b:0xD4},{ pos:.66,r:0x2D,g:0xD4,b:0xBF},{ pos:1,r:0x0D,g:0x94,b:0x88 }],
  // ── Multi-color gradients (5 stops) ──
  tricolor:     [{ pos:0,r:0x60,g:0xA5,b:0xFA},{ pos:.25,r:0xBF,g:0xDB,b:0xFE},{ pos:.5,r:0xF8,g:0xFA,b:0xFC},{ pos:.75,r:0xFC,g:0xA5,b:0xA5},{ pos:1,r:0xEF,g:0x44,b:0x44 }],
  galaxy:       [{ pos:0,r:0x81,g:0x8C,b:0xF8},{ pos:.25,r:0xC0,g:0x84,b:0xFC},{ pos:.5,r:0xF4,g:0x72,b:0xB6},{ pos:.75,r:0x67,g:0xE8,b:0xF9},{ pos:1,r:0x2C,g:0xCE,b:0xD2 }],
  candy:        [{ pos:0,r:0xF4,g:0x72,b:0xB6},{ pos:.25,r:0xFB,g:0xBF,b:0x24},{ pos:.5,r:0xA3,g:0xE6,b:0x35},{ pos:.75,r:0x67,g:0xE8,b:0xF9},{ pos:1,r:0xC0,g:0x84,b:0xFC }],
  // Hard-edge blocks: Blue → White → Red → Yellow (no gradient blending)
  gundam:       [{ pos:0,r:0x3B,g:0x82,b:0xF6},{ pos:.34,r:0x3B,g:0x82,b:0xF6},{ pos:.35,r:0xF8,g:0xFA,b:0xFC},{ pos:.59,r:0xF8,g:0xFA,b:0xFC},{ pos:.60,r:0xEF,g:0x44,b:0x44},{ pos:.79,r:0xEF,g:0x44,b:0x44},{ pos:.80,r:0xFA,g:0xCC,b:0x15},{ pos:1,r:0xFA,g:0xCC,b:0x15 }],
  // Hard-edge blocks, eva: Purple → Green → Orange
  "eva-01":     [{ pos:0,r:0xA8,g:0x55,b:0xF7},{ pos:.34,r:0xA8,g:0x55,b:0xF7},{ pos:.35,r:0x22,g:0xC5,b:0x5E},{ pos:.67,r:0x22,g:0xC5,b:0x5E},{ pos:.68,r:0xF9,g:0x73,b:0x16},{ pos:1,r:0xF9,g:0x73,b:0x16 }],
  // Hard-edge blocks, voltron: Blue → Red → Green → Yellow → Black
  voltron:      [{ pos:0,r:0x3B,g:0x82,b:0xF6},{ pos:.19,r:0x3B,g:0x82,b:0xF6},{ pos:.20,r:0xEF,g:0x44,b:0x44},{ pos:.39,r:0xEF,g:0x44,b:0x44},{ pos:.40,r:0x22,g:0xC5,b:0x5E},{ pos:.59,r:0x22,g:0xC5,b:0x5E},{ pos:.60,r:0xFA,g:0xCC,b:0x15},{ pos:.79,r:0xFA,g:0xCC,b:0x15},{ pos:.80,r:0x33,g:0x33,b:0x33},{ pos:1,r:0x33,g:0x33,b:0x33 }],
  // Hard-edge blocks, cyber: Cyan → Magenta → Yellow (synthwave)
  cyber:        [{ pos:0,r:0x06,g:0xB6,b:0xD4},{ pos:.34,r:0x06,g:0xB6,b:0xD4},{ pos:.35,r:0xEC,g:0x48,b:0x99},{ pos:.67,r:0xEC,g:0x48,b:0x99},{ pos:.68,r:0xFA,g:0xCC,b:0x15},{ pos:1,r:0xFA,g:0xCC,b:0x15 }],
  // Hard-edge blocks, joker: Purple → Green → White
  joker:        [{ pos:0,r:0xA8,g:0x55,b:0xF7},{ pos:.34,r:0xA8,g:0x55,b:0xF7},{ pos:.35,r:0x22,g:0xC5,b:0x5E},{ pos:.67,r:0x22,g:0xC5,b:0x5E},{ pos:.68,r:0xFA,g:0xFA,b:0xFA},{ pos:1,r:0xFA,g:0xFA,b:0xFA }],
  // Frost: ice crystal oscillation — light ⇄ dark ⇄ light
  frost:        [{ pos:0,r:0xE0,g:0xF7,b:0xFA},{ pos:.25,r:0x38,g:0xBD,b:0xF8},{ pos:.5,r:0xBA,g:0xE6,b:0xFD},{ pos:.75,r:0x02,g:0x84,b:0xC7},{ pos:1,r:0x7D,g:0xD3,b:0xFC }],
  // Hard-edge: Red → Orange → Yellow → White
  inferno:      [{ pos:0,r:0xEF,g:0x44,b:0x44},{ pos:.27,r:0xEF,g:0x44,b:0x44},{ pos:.28,r:0xF9,g:0x73,b:0x16},{ pos:.52,r:0xF9,g:0x73,b:0x16},{ pos:.53,r:0xFA,g:0xCC,b:0x15},{ pos:.77,r:0xFA,g:0xCC,b:0x15},{ pos:.78,r:0xFE,g:0xF3,b:0xC7},{ pos:1,r:0xFE,g:0xF3,b:0xC7 }],
  // Hard-edge: Blue → Gold → Silver
  thor:         [{ pos:0,r:0x3B,g:0x82,b:0xF6},{ pos:.32,r:0x3B,g:0x82,b:0xF6},{ pos:.33,r:0xFA,g:0xCC,b:0x15},{ pos:.64,r:0xFA,g:0xCC,b:0x15},{ pos:.65,r:0xE2,g:0xE8,b:0xF0},{ pos:1,r:0xE2,g:0xE8,b:0xF0 }],
  // Hard-edge: Black → Green → Lime
  venom:        [{ pos:0,r:0x1A,g:0x1A,b:0x1A},{ pos:.32,r:0x1A,g:0x1A,b:0x1A},{ pos:.33,r:0x22,g:0xC5,b:0x5E},{ pos:.64,r:0x22,g:0xC5,b:0x5E},{ pos:.65,r:0x4A,g:0xDE,b:0x80},{ pos:1,r:0x4A,g:0xDE,b:0x80 }],
  // rainbow: per-character color, handled in logo.ts
  rainbow:      [{ pos:0,r:0xEC,g:0x48,b:0x99},{ pos:1,r:0xA8,g:0x55,b:0xF7 }],
  prism:        [{ pos:0,r:0xEC,g:0x48,b:0x99},{ pos:1,r:0x22,g:0xD3,b:0xEE }],
  "voltron-prism": [{ pos:0,r:0xEF,g:0x44,b:0x44},{ pos:1,r:0x3B,g:0x82,b:0xF6 }],
};

let activeTheme = "cyan";

export function getColors(): ColorScheme {
  const s = schemes[activeTheme] ?? schemes.cyan!;
  // Safety: ensure chalk instances are properly initialized after bundling
  if (!s || !s.text) return schemes.cyan!;
  return s;
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

export function getThemeNames(): string[] {
  return Object.keys(schemes);
}

export function getLogoGradient(): GradientStop[] {
  return logoGradients[activeTheme] ?? logoGradients.cyan!;
}

export function interpolateGradient(
  stops: GradientStop[],
  t: number,
): ChalkFn {
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
