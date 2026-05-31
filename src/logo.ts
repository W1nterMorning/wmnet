import figlet from "figlet";
import { join } from "node:path";
import { logoGradientStops, interpolateGradient } from "./theme";

// Pre-load the Slant font. Falls back gracefully if font file is missing
// (e.g. when running as a compiled binary without the fonts/ directory).
let fontLoaded = false;
try {
  const fontDir = join(import.meta.dirname, "..", "fonts");
  figlet.defaults({ fontPath: fontDir });
  // Verify font loads
  figlet.textSync("Test", { font: "Slant", width: 10 });
  fontLoaded = true;
} catch {
  // Font not available — fall back to simple logo below
}

let cached: { lines: string[]; colors: ((s: string) => string)[] } | null =
  null;

export function getLogo(): { lines: string[]; colors: ((s: string) => string)[] } {
  if (cached) return cached;

  let lines: string[];

  if (fontLoaded) {
    const raw =
      figlet.textSync("WinterMorning", { font: "Slant", width: 80 }) ?? "";
    lines = raw.split("\n").filter((l) => l.trim().length > 0);
  } else {
    // Fallback logo — clean monospace typography, no figlet dependency
    lines = [
      "  ╦ ╦┬┌┐┌┌┬┐┌─┐┬─┐╔╦╗┌─┐┬─┐┌┐┌┬┌┐┌┌─┐",
      "  ║║║││││ │ ├┤ ├┬┘║║║│ │├┬┘││││││││ ┬",
      "  ╚╩╝┴┘└┘ ┴ └─┘┴└─╩ ╩└─┘┴└─┘└┘┴┘└┘└─┘",
    ];
  }

  const colors = lines.map((_, i) => {
    const t = lines.length > 1 ? i / (lines.length - 1) : 0;
    const chalkFn = interpolateGradient(logoGradientStops, t);
    return (s: string) => chalkFn(s);
  });

  cached = { lines, colors };
  return cached;
}
