import chalk from "chalk";
import { getLogo } from "./logo";
import { getColors, setTheme, getThemeNames, getTheme } from "./theme";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadConfig, getProfiles, saveConfig, addProfile, updateProfile, removeProfile } from "./config";
import { getCurrentStatus, switchGateway } from "./network";
import { captureState, undoLastSwitch } from "./undo";
import { pingTest } from "./connectivity";
import type { Profile, AppStep, StageState, NetworkStatus, Settings, FieldDef } from "./types";
import { ProfileSchema } from "./types";

let status: NetworkStatus | null = null;
let profiles: Profile[] = [];
let step: AppStep = { kind: "loading" };
let settings: Settings;
const themeNames = getThemeNames();

function profileToFields(p: Profile): FieldDef[] {
  return [
    { key: "name", label: "Name", value: p.name, placeholder: "Profile name" },
    { key: "gateway", label: "Gateway", value: p.gateway, placeholder: "192.168.x.x" },
    { key: "staticIp", label: "Static IP", value: p.staticIp ?? "", placeholder: "Leave empty if DHCP" },
    { key: "subnetMask", label: "Subnet", value: p.subnetMask ?? "", placeholder: "255.255.255.0" },
    { key: "dns", label: "DNS", value: p.dns.join(", "), placeholder: "8.8.8.8, 1.1.1.1" },
    { key: "description", label: "Description", value: p.description ?? "", placeholder: "Optional" },
    { key: "useDhcp", label: "DHCP", value: p.useDhcp ? "true" : "false", placeholder: "Space = toggle" },
  ];
}

function emptyFields(): FieldDef[] {
  return [
    { key: "name", label: "Name", value: "", placeholder: "Profile name" },
    { key: "gateway", label: "Gateway", value: "", placeholder: "192.168.x.x" },
    { key: "staticIp", label: "Static IP", value: "", placeholder: "Leave empty if DHCP" },
    { key: "subnetMask", label: "Subnet", value: "", placeholder: "255.255.255.0" },
    { key: "dns", label: "DNS", value: "", placeholder: "8.8.8.8, 1.1.1.1" },
    { key: "description", label: "Description", value: "", placeholder: "Optional" },
    { key: "useDhcp", label: "DHCP", value: "true", placeholder: "Space = toggle" },
  ];
}

function fieldsToProfile(fields: FieldDef[], existingId?: string, existingOrder?: number): Profile {
  const get = (key: string) => fields.find((f) => f.key === key)?.value ?? "";
  const dnsRaw = get("dns");
  const dns = dnsRaw ? dnsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const name = get("name");
  return {
    id: existingId ?? name.toLowerCase().replace(/\s+/g, "-"),
    name,
    gateway: get("gateway"),
    staticIp: get("staticIp") || undefined,
    subnetMask: get("subnetMask") || undefined,
    dns,
    description: get("description"),
    useDhcp: get("useDhcp") !== "false",
    testTarget: "8.8.8.8",
    color: "cyan",
    order: existingOrder ?? profiles.length,
  };
}

// ── Helpers ──
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dhcpIcon(val: string): string {
  return val === "false" ? "☐" : "☑";
}

// ── Render ────────────────────────────────────────────────────────

async function render() {
  console.clear();
  const c = getColors();
  const logo = getLogo();

  // Logo
  if (logo.preColored) {
    for (const line of logo.lines) {
      console.log("  " + line);
    }
  } else {
    for (let i = 0; i < logo.lines.length; i++) {
      console.log("  " + logo.colors[i]!(logo.lines[i]!));
    }
  }
  console.log("  " + c.dim("gateway switcher for macOS"));
  console.log();
  console.log("  " + c.divider("─".repeat(50)));
  console.log();

  // Status card
  if (status) {
    const st = status; // narrow for TS
    console.log("  " + chalk.bold.white("Current Status"));
    console.log("  " + c.dim("─".repeat(33)));
    const gwIp = st.gateway ?? "unknown";
    const dnsOk = st.dns.length > 0 ? c.success("●") : c.error("●");
    console.log(`  ${c.muted("Local IP".padEnd(12))}${c.text(st.localIp ?? "unknown")}`);
    const ifStr = st.serviceName ?? "unknown";
    const ifExtra = st.interfaceName ? c.dim(` (${st.interfaceName})`) : "";
    let ifLine = `  ${c.muted("Interface".padEnd(12))}${c.text(ifStr)}${ifExtra}`;
    if (st.ssid) ifLine += `  ${c.dim("⌿")} ${c.textCool(st.ssid)}`;
    console.log(ifLine);
    const match = profiles.find((p) => p.gateway === st.gateway);
    let gwLine = `  ${c.muted("Gateway".padEnd(12))}${c.brand.bold(gwIp)}`;
    if (match) gwLine += `   ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(match.name.toUpperCase())} `)}`;
    console.log(gwLine);
    console.log(`  ${c.muted("DNS".padEnd(12))}${dnsOk} ${c.text(st.dns.join(", ") || "none")}`);
    console.log("  " + c.dim("─".repeat(33)));
    console.log();
  }

  // ── Step: loading ──
  if (step.kind === "loading") {
    console.log("  " + c.brand("◌") + c.textWarm("  Loading network status..."));
  }

  // ── Step: selecting / confirming ──
  if (step.kind === "selecting" || step.kind === "confirming" || step.kind === "exit-confirm" || step.kind === "delete-confirm") {
    console.log("  " + chalk.bold.white("Profiles"));
    console.log();
    const hlIdx = step.kind === "delete-confirm" ? step.profileIndex
                : step.kind === "exit-confirm" ? 0
                : step.highlightIndex;

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i]!;
      const hl = i === hlIdx && step.kind !== "exit-confirm";
      const isActive = p.gateway === status?.gateway;
      const arrow = hl ? c.brand.bold("❯") : " ";
      const name = hl ? c.brand.bold(p.name.padEnd(26)) : c.text(p.name.padEnd(26));
      const ip = hl ? c.textWarm(p.gateway) : c.textCool(p.gateway);
      const activeMark = isActive ? "  " + c.success.bold("◀ active") : "";
      console.log(`  ${arrow} ${name} ${ip}${activeMark}`);
      console.log(`    ${c.dim(p.description || "")}`);
      if (i < profiles.length - 1) console.log();
    }
    console.log();
    console.log("  " + c.divider("─".repeat(54)));

    if (step.kind === "confirming") {
      const p = profiles[step.highlightIndex]!;
      console.log();
      console.log("  " + c.textWarm.bold(`Switch to "${p.name}" (${p.gateway})?`));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(" = Confirm    ") + c.error.bold("Esc") + c.dim(" = Cancel"));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else if (step.kind === "delete-confirm") {
      const p = profiles[step.profileIndex]!;
      console.log();
      console.log("  " + c.error.bold(`Delete "${p.name}" (${p.gateway})?`));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(" = Delete    ") + c.error.bold("Esc") + c.dim(" = Cancel"));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else if (step.kind === "exit-confirm") {
      console.log();
      console.log("  " + c.textWarm.bold("Quit wmnet?"));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(" = Quit    ") + c.error.bold("Esc") + c.dim(" = Cancel"));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else {
      console.log("  " + c.textWarm.bold("↑↓") + c.dim(" move   ") + c.textWarm.bold("Enter") + c.dim(" select   ") + c.textWarm.bold("1-9") + c.dim(" quick   ") + c.textWarm.bold("a") + c.dim(" add   ") + c.textWarm.bold("e") + c.dim(" edit"));
      console.log("  " + c.textWarm.bold("d") + c.dim(" delete   ") + c.textWarm.bold("t") + c.dim(" theme   ") + c.textWarm.bold("r") + c.dim(" refresh   ") + c.textWarm.bold("q") + c.dim(" quit"));
    }
  }

  // ── Step: theme-picker (3-column grid) ──
  if (step.kind === "theme-picker") {
    console.log("  " + chalk.bold.white("Select Theme"));
    console.log();
    const COLS = 3;
    const perCol = Math.ceil(themeNames.length / COLS);
    const idx = step.themeIndex;
    const colW = 18;
    for (let r = 0; r < perCol; r++) {
      let row = "  ";
      for (let col = 0; col < COLS; col++) {
        const i = col * perCol + r;
        if (i >= themeNames.length) break;
        const t = themeNames[i]!;
        const hl = i === idx;
        const active = t === getTheme();
        const prefix = hl ? "❯ " : "  ";
        const mark = active ? " ◀" : "  ";
        const visW = prefix.length + t.length + mark.length;
        const pad = " ".repeat(Math.max(0, colW - visW));
        const nameColored = hl ? c.brand.bold(t) : active ? c.success(t) : c.text(t);
        const prefixColored = hl ? c.brand.bold(prefix) : prefix;
        const markColored = active ? c.success.bold(mark) : mark;
        row += prefixColored + nameColored + pad + markColored;
      }
      console.log(row);
    }
    console.log();
    console.log("  " + c.divider("─".repeat(54)));
    console.log("  " + c.textWarm.bold("↑↓←→") + c.dim(" navigate   ") + c.textWarm.bold("Enter") + c.dim(" apply   ") + c.error.bold("Esc") + c.dim(" back"));
  }

  // ── Step: editing / adding ──
  if (step.kind === "editing" || step.kind === "adding") {
    const title = step.kind === "editing" ? "Edit Profile" : "Add Profile";
    console.log("  " + chalk.bold.white("── " + title + " ──"));
    console.log();
    for (let i = 0; i < step.fields.length; i++) {
      const f = step.fields[i]!;
      const hl = i === step.fieldIndex;
      const arrow = hl ? c.brand.bold("❯") : " ";
      const label = (hl ? c.brand : c.muted)((f.label + ":").padEnd(14));

      let displayVal: string;
      if (f.key === "useDhcp") {
        displayVal = dhcpIcon(f.value);
      } else if (hl) {
        displayVal = f.value + c.brand("█"); // cursor
      } else {
        displayVal = f.value || c.dim(f.placeholder);
      }
      console.log(`  ${arrow} ${label}${displayVal}`);
    }
    console.log();
    console.log("  " + c.divider("─".repeat(54)));
    console.log("  " + c.textWarm.bold("↑↓") + c.dim(" field   ") + c.textWarm.bold("Tab") + c.dim(" next   ") + c.brand.bold("⌫") + c.dim(" delete"));
    console.log("  " + c.textWarm.bold("Space") + c.dim(" toggle DHCP   ") + c.textWarm.bold("Enter") + c.dim(" save   ") + c.error.bold("Esc") + c.dim(" cancel"));
  }

  // ── Step: switching ──
  if (step.kind === "switching") {
    console.log("  " + chalk.bold.white("── Switching Gateway ──"));
    console.log();
    console.log("  " + c.muted("Target ") + c.textWarm.bold(`${step.profile.name}  ${c.textCool("→")}  ${step.profile.gateway}`));
    console.log();
    for (const s of step.stages) {
      let icon: string; let style: (x: string) => string; let label: (x: string) => string;
      if (s.status === "done")        { icon = "✓"; style = c.success; label = c.text; }
      else if (s.status === "running") { icon = "◌"; style = c.brand; label = c.textWarm; }
      else if (s.status === "failed")  { icon = "✗"; style = c.error; label = c.error; }
      else                             { icon = "·"; style = c.dim; label = c.dim; }
      let line = `    ${style(icon)}  ${label(s.label)}`;
      if (s.detail && s.status === "done") line += `  ${c.dim(`(${s.detail})`)}`;
      if (s.detail && s.status === "failed") line += `\n      ${c.error(s.detail)}`;
      console.log(line);
    }
    console.log();
  }

  // ── Step: done ──
  if (step.kind === "done") {
    if (step.success) {
      console.log("  " + c.success.bold("── Switch Complete ──"));
      console.log();
      console.log("    " + c.success.bold("✓") + "  " + c.success("Gateway switched successfully"));
      console.log();
      console.log(`    ${c.muted("Gateway")}  ${c.brand.bold(step.profile.gateway)}  ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(step.profile.name.toUpperCase())} `)}`);
      // Multi-target ping
      const targets = [
        { host: "8.8.8.8", label: "Google" },
        { host: "github.com", label: "GitHub" },
        { host: "baidu.com", label: "Baidu" },
        { host: "bilibili.com", label: "Bilibili" },
      ];
      for (const t of targets) {
        const r = await pingTest(t.host, 2, 3);
        const color = r.lossPercent === 0 ? c.success : r.lossPercent < 50 ? c.warn : c.error;
        const icon = r.success ? c.success("✓") : c.error("✗");
        console.log(`    ${c.muted("Ping".padEnd(10))}${c.textCool(t.label.padEnd(10))} ${color(`${r.avg.toFixed(0)}ms`.padStart(5))} ${icon}`);
      }
    } else {
      console.log("  " + c.error.bold("── Switch Failed ──"));
      console.log();
      console.log("    " + c.error.bold("✗") + "  " + c.error("Gateway switch failed"));
      if (step.error) console.log(`    ${c.dim(step.error)}`);
      console.log();
      console.log("  " + c.dim("Gateway automatically reverted."));
    }
    console.log();
    console.log("  " + c.dim("Press any key to return to menu..."));
  }

  console.log();
}

// ── Switch execution ─────────────────────────────────────────────

async function executeSwitch(profile: Profile) {
  const stages: StageState[] = [
    { label: "Snapshot saved", status: "pending" },
    { label: "Deleting default route", status: "pending" },
    { label: `Adding new route (${profile.gateway})`, status: "pending" },
    { label: "Updating network service", status: "pending" },
    { label: `Verifying connectivity (${profile.testTarget})`, status: "pending" },
  ];
  step = { kind: "switching", profile, stages };
  await render();

  const start = Date.now();
  const current = getCurrentStatus();
  if (current.gateway && current.serviceName) {
    captureState(current.gateway, current.serviceName, current.dns, current.dhcp, current.localIp ?? undefined, undefined);
  }
  stages[0]!.status = "done"; stages[0]!.detail = `${Date.now() - start}ms`;
  await render();

  try {
    stages[1]!.status = "running"; await render(); await sleep(200);
    stages[1]!.status = "done"; await render();
    stages[2]!.status = "running"; await render();
    await switchGateway(profile);
    stages[2]!.status = "done"; await render();
    stages[3]!.status = "done"; await render();
    await sleep(1500); // let network stack settle after route change
    stages[4]!.status = "running"; await render();
    const pingResult = await pingTest(profile.testTarget, 3, settings.testTimeoutSeconds);
    stages[4]!.status = pingResult.success ? "done" : "failed";
    stages[4]!.detail = pingResult.success ? `${pingResult.avg.toFixed(1)}ms` : "no response";
    await render();
    step = { kind: "done", profile, success: true };
  } catch (e) {
    const msg = (e as Error).message;
    const running = stages.find((s) => s.status === "running");
    if (running) running.status = "failed";
    await render(); await sleep(500);
    try {
      await undoLastSwitch();
      step = { kind: "done", profile, success: false, error: msg };
    } catch {
      step = { kind: "done", profile, success: false, error: `${msg}\nAuto-undo also failed` };
    }
  }
  await render();
}

// ── stdin handling ───────────────────────────────────────────────

function setupInput() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (data: string) => {
    const c = getColors();

    // ── Done → return to menu ──
    if (step.kind === "done") {
      status = getCurrentStatus();
      profiles = getProfiles();
      step = { kind: "selecting", highlightIndex: 0 };
      await render();
      return;
    }

    if (step.kind === "loading") return;

    // ── Theme picker ──
    if (step.kind === "theme-picker") {
      const cols = 3;
      const perCol = Math.ceil(themeNames.length / cols);
      const idx = step.themeIndex;
      const curCol = Math.floor(idx / perCol);
      if (data === "\x1b[A" || data === "k") {
        step.themeIndex = idx - 1;
        if (Math.floor(step.themeIndex / perCol) !== curCol) step.themeIndex = idx;
        if (step.themeIndex < 0) step.themeIndex = 0;
        await render();
      } else if (data === "\x1b[B" || data === "j") {
        step.themeIndex = idx + 1;
        if (Math.floor(step.themeIndex / perCol) !== curCol) step.themeIndex = idx;
        if (step.themeIndex >= themeNames.length) step.themeIndex = themeNames.length - 1;
        await render();
      } else if (data === "\x1b[D" || data === "h") {
        step.themeIndex = Math.max(0, idx - perCol);
        await render();
      } else if (data === "\x1b[C" || data === "l") {
        const next = idx + perCol;
        step.themeIndex = next < themeNames.length ? next : idx;
        await render();
      } else if (data === "\r") {
        const name = themeNames[step.themeIndex]!;
        setTheme(name);
        const config = loadConfig();
        config.settings.theme = name as any;
        saveConfig(config);
        step = { kind: "selecting", highlightIndex: 0 };
        await render();
      } else if (data === "\x1b") {
        step = { kind: "selecting", highlightIndex: 0 };
        await render();
      }
      return;
    }

    // ── Exit confirm ──
    if (step.kind === "exit-confirm") {
      if (data === "\r") { console.log(); process.exit(0); }
      if (data === "\x1b") { step = { kind: "selecting", highlightIndex: 0 }; await render(); }
      return;
    }

    // ── Delete confirm ──
    if (step.kind === "delete-confirm") {
      if (data === "\r") {
        const p = profiles[step.profileIndex];
        if (p) {
          removeProfile(p.id);
          profiles = getProfiles();
        }
        step = { kind: "selecting", highlightIndex: 0 };
        await render();
      } else if (data === "\x1b") {
        step = { kind: "selecting", highlightIndex: Math.min(step.profileIndex, profiles.length - 1) };
        await render();
      }
      return;
    }

    // ── Editing / Adding ──
    if (step.kind === "editing" || step.kind === "adding") {
      if (data === "\x1b") {
        step = { kind: "selecting", highlightIndex: 0 };
        await render();
        return;
      }
      if (data === "\r") {
        // Save
        try {
          const isEdit = step.kind === "editing";
          const st = step as any;
          const existing = isEdit ? profiles.find(p => p.id === st.profileId) : undefined;
          const profile = fieldsToProfile(st.fields, isEdit ? st.profileId : undefined, existing?.order);
          ProfileSchema.parse(profile);
          if (isEdit) { updateProfile(st.profileId, profile); }
          else { addProfile(profile); }
          profiles = getProfiles();
          step = { kind: "selecting", highlightIndex: 0 };
        } catch (e: any) {
          // Show error briefly
          console.clear();
          console.log("  " + c.error("✗ " + e.message));
          await sleep(1500);
        }
        await render();
        return;
      }
      if (data === "\t" || data === "\x1b[B") {
        step.fieldIndex = Math.min(step.fields.length - 1, step.fieldIndex + 1);
        await render();
        return;
      }
      if (data === "\x1b[A") {
        step.fieldIndex = Math.max(0, step.fieldIndex - 1);
        await render();
        return;
      }
      const field = step.fields[step.fieldIndex]!;
      if (data === "\x7f" || data === "\b") {
        // Backspace
        if (field.key === "useDhcp") { field.value = field.value === "false" ? "true" : "false"; }
        else { field.value = field.value.slice(0, -1); }
        await render();
        return;
      }
      if (data === " " && field.key === "useDhcp") {
        // Space toggles DHCP
        field.value = field.value === "false" ? "true" : "false";
        await render();
        return;
      }
      // Regular character
      if (data.length === 1 && data >= " ") {
        if (field.key !== "useDhcp") field.value += data;
        await render();
      }
      return;
    }

    // ── Selecting ──
    if (step.kind === "selecting") {
      if (data === "\x1b[A" || data === "k") {
        step.highlightIndex = Math.max(0, step.highlightIndex - 1);
        await render();
      } else if (data === "\x1b[B" || data === "j") {
        step.highlightIndex = Math.min(profiles.length - 1, step.highlightIndex + 1);
        await render();
      } else if (data === "\r") {
        const p = profiles[step.highlightIndex];
        if (!p) return;
        if (p.gateway === status?.gateway) {
          // Already active — no-op or brief message
          await render();
          return;
        }
        if (settings.confirmBeforeSwitch) {
          step = { kind: "confirming", highlightIndex: step.highlightIndex };
        } else {
          await executeSwitch(p);
        }
        await render();
      } else if (data === "q") {
        step = { kind: "exit-confirm" };
        await render();
      } else if (data === "t") {
        const idx = themeNames.indexOf(getTheme());
        step = { kind: "theme-picker", themeIndex: Math.max(0, idx) };
        await render();
      } else if (data === "a") {
        step = { kind: "adding", fields: emptyFields(), fieldIndex: 0 };
        await render();
      } else if (data === "e") {
        const p = profiles[step.highlightIndex];
        if (p) {
          step = { kind: "editing", fields: profileToFields(p), fieldIndex: 0, profileId: p.id };
        }
        await render();
      } else if (data === "d") {
        if (profiles.length > 0) {
          step = { kind: "delete-confirm", profileIndex: step.highlightIndex };
        }
        await render();
      } else if (data === "r") {
        status = getCurrentStatus();
        profiles = getProfiles();
        await render();
      } else if (data === "u") {
        const result = await undoLastSwitch();
        console.clear();
        console.log("  " + (result.success ? c.success("✓") : c.error("✗")) + " " + result.message);
        await sleep(1500);
        status = getCurrentStatus();
        profiles = getProfiles();
        step = { kind: "selecting", highlightIndex: 0 };
        await render();
      } else if (data >= "1" && data <= "9") {
        const idx = parseInt(data) - 1;
        if (idx < profiles.length && profiles[idx]) {
          step.highlightIndex = idx;
          if (settings.confirmBeforeSwitch) {
            step = { kind: "confirming", highlightIndex: idx };
          } else {
            await executeSwitch(profiles[idx]!);
          }
          await render();
        }
      }
      return;
    }

    // ── Confirming ──
    if (step.kind === "confirming") {
      if (data === "\r") {
        const p = profiles[step.highlightIndex];
        if (p) await executeSwitch(p);
      } else if (data === "\x1b") {
        step = { kind: "selecting", highlightIndex: step.highlightIndex };
        await render();
      }
      return;
    }
  });

  process.on("SIGINT", () => {
    console.log("\n" + getColors().dim("Cancelled"));
    process.exit(0);
  });
}

// ── Public entry ─────────────────────────────────────────────────

export async function startInteractive(): Promise<void> {
  const config = loadConfig();
  profiles = getProfiles();
  settings = config.settings;
  setTheme(settings.theme);

  const c = getColors();
  await render();

  // Check first run — only auto-detect if config file truly doesn't exist
  const configPath = join(homedir(), ".config", "wmnet", "profiles.yaml");
  const isFirstRun = !existsSync(configPath);
  if (isFirstRun && profiles.length === 0) {
    console.log("  " + c.warn("⚠") + "  " + c.textWarm("No profiles found. Auto-detecting current network..."));
    console.log();
    const current = getCurrentStatus();
    status = current;
    if (current.gateway && current.serviceName) {
      const defaultProfile: Profile = {
        id: "default", name: "My Gateway", gateway: current.gateway,
        useDhcp: current.dhcp, dns: current.dns,
        description: "Auto-detected default gateway", order: 0,
        testTarget: "8.8.8.8", color: "cyan",
      };
      config.profiles = [defaultProfile];
      saveConfig(config);
      profiles = [defaultProfile];
      settings = config.settings;
      console.log("  " + c.success("✓") + c.text(` Found: ${current.serviceName} (${current.interfaceName ?? ""}) → ${current.gateway}`));
      console.log();
      console.log("  " + c.dim('Created default profile: "My Gateway"'));
      console.log("  " + c.dim("You can edit it later with:  e"));
    } else {
      console.log("  " + c.error("✗") + "  " + c.text("Could not detect network."));
      console.log("  " + c.dim("Please add a profile manually:  a"));
    }
    console.log();
  } else if (!isFirstRun && profiles.length === 0) {
    // File exists but parsing failed — warn, don't overwrite
    console.log("  " + c.error("✗") + "  " + c.text("Config file exists but could not be parsed."));
    console.log("  " + c.dim("Check ~/.config/wmnet/profiles.yaml for errors."));
    console.log("  " + c.dim("Or add a profile:  a"));
    console.log();
    status = getCurrentStatus();
  } else {
    status = getCurrentStatus();
  }

  setupInput();
  step = { kind: "selecting", highlightIndex: 0 };
  await render();
}
