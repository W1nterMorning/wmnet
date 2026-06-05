import chalk from "chalk";
import { getLogo } from "./logo";
import { getColors, setTheme, getThemeNames, getTheme } from "./theme";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadConfig, getProfiles, saveConfig, addProfile, updateProfile, removeProfile } from "./config";
import { getCurrentStatus, switchGateway } from "./network";
import { captureState, undoLastSwitch } from "./undo";
import { pingTest, tcpTest } from "./connectivity";
import { t, setLang, getLang } from "./i18n";
import type { Profile, AppStep, StageState, NetworkStatus, Settings, FieldDef } from "./types";
import { ProfileSchema } from "./types";

let status: NetworkStatus | null = null;
let profiles: Profile[] = [];
let step: AppStep = { kind: "loading" };
let settings: Settings;
const themeNames = getThemeNames();

function profileToFields(p: Profile): FieldDef[] {
  return [
    { key: "name", label: t("field.name"), value: p.name, placeholder: t("placeholder.name") },
    { key: "gateway", label: t("field.gateway"), value: p.gateway, placeholder: t("placeholder.gateway") },
    { key: "staticIp", label: t("field.staticIp"), value: p.staticIp ?? "", placeholder: t("placeholder.staticIp") },
    { key: "subnetMask", label: t("field.subnetMask"), value: p.subnetMask ?? "", placeholder: t("placeholder.subnet") },
    { key: "dns", label: t("field.dns"), value: p.dns.join(", "), placeholder: t("placeholder.dns") },
    { key: "description", label: t("field.description"), value: p.description ?? "", placeholder: t("placeholder.desc") },
    { key: "useDhcp", label: t("field.dhcp"), value: p.useDhcp ? "true" : "false", placeholder: t("placeholder.dhcp") },
  ];
}

function emptyFields(): FieldDef[] {
  return [
    { key: "name", label: t("field.name"), value: "", placeholder: t("placeholder.name") },
    { key: "gateway", label: t("field.gateway"), value: "", placeholder: t("placeholder.gateway") },
    { key: "staticIp", label: t("field.staticIp"), value: "", placeholder: t("placeholder.staticIp") },
    { key: "subnetMask", label: t("field.subnetMask"), value: "", placeholder: t("placeholder.subnet") },
    { key: "dns", label: t("field.dns"), value: "", placeholder: t("placeholder.dns") },
    { key: "description", label: t("field.description"), value: "", placeholder: t("placeholder.desc") },
    { key: "useDhcp", label: t("field.dhcp"), value: "true", placeholder: t("placeholder.dhcp") },
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
    testTarget: "google.com",
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
  console.log("  " + c.dim(t("logo.tagline")));
  console.log();
  console.log("  " + c.divider("─".repeat(50)));
  console.log();

  // Status card
  if (status) {
    const st = status; // narrow for TS
    console.log("  " + chalk.bold.white(t("status.title")));
    console.log("  " + c.dim("─".repeat(33)));
    const gwIp = st.gateway ?? "unknown";
    const dnsOk = st.dns.length > 0 ? c.success("●") : (st.dhcp ? c.success("●") : c.error("●"));
    console.log(`  ${c.muted(t("status.localIp").padEnd(12))}${c.text(st.localIp ?? "unknown")}`);
    const ifStr = st.serviceName ?? "unknown";
    const ifExtra = st.interfaceName ? c.dim(` (${st.interfaceName})`) : "";
    let ifLine = `  ${c.muted(t("status.interface").padEnd(12))}${c.text(ifStr)}${ifExtra}`;
    if (st.ssid) ifLine += `  ${c.dim("⌿")} ${c.textCool(st.ssid)}`;
    console.log(ifLine);
    const match = profiles.find((p) => p.gateway === st.gateway);
    let gwLine = `  ${c.muted(t("status.gateway").padEnd(12))}${c.brand.bold(gwIp)}`;
    if (match) gwLine += `   ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(match.name.toUpperCase())} `)}`;
    console.log(gwLine);
    const dnsDisplay = st.dns.length > 0 ? c.text(st.dns.join(", ")) : (st.dhcp ? c.success(t("dns.dhcpAuto")) : c.error(t("dns.none")));
    console.log(`  ${c.muted(t("status.dns").padEnd(12))}${dnsOk} ${dnsDisplay}`);
    console.log("  " + c.dim("─".repeat(33)));
    console.log();
  }

  // ── Step: loading ──
  if (step.kind === "loading") {
    console.log("  " + c.brand("◌") + c.textWarm("  " + t("msg.loading")));
  }

  // ── Step: selecting / confirming ──
  if (step.kind === "selecting" || step.kind === "confirming" || step.kind === "exit-confirm" || step.kind === "delete-confirm") {
    console.log("  " + chalk.bold.white(t("profiles.title")));
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
      const activeMark = isActive ? "  " + c.success.bold("◀ " + t("profiles.active")) : "";
      console.log(`  ${arrow} ${name} ${ip}${activeMark}`);
      console.log(`    ${c.dim(p.description || "")}`);
      if (i < profiles.length - 1) console.log();
    }
    console.log();
    console.log("  " + c.divider("─".repeat(54)));

    if (step.kind === "confirming") {
      const p = profiles[step.highlightIndex]!;
      console.log();
      console.log("  " + c.textWarm.bold(`${t("confirm.switchTo")} "${p.name}" (${p.gateway})?`));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(` = ${t("confirm.confirm")}    `) + c.error.bold("Esc") + c.dim(` = ${t("confirm.cancel")}`));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else if (step.kind === "delete-confirm") {
      const p = profiles[step.profileIndex]!;
      console.log();
      console.log("  " + c.error.bold(`${t("confirm.delete")} "${p.name}" (${p.gateway})?`));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(` = ${t("confirm.delete")}    `) + c.error.bold("Esc") + c.dim(` = ${t("confirm.cancel")}`));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else if (step.kind === "exit-confirm") {
      console.log();
      console.log("  " + c.textWarm.bold(t("confirm.quitMsg")));
      console.log("  " + c.textWarm.bold("Enter") + c.dim(` = ${t("confirm.quit")}    `) + c.error.bold("Esc") + c.dim(` = ${t("confirm.cancel")}`));
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else {
      console.log("  " + c.textWarm.bold("↑↓") + c.dim(" " + t("btn.move") + "   ") + c.textWarm.bold("Enter") + c.dim(" " + t("btn.select") + "   ") + c.textWarm.bold("1-9") + c.dim(" " + t("btn.quick") + "   ") + c.textWarm.bold("a") + c.dim(" " + t("btn.add") + "   ") + c.textWarm.bold("e") + c.dim(" " + t("btn.edit")));
      console.log("  " + c.textWarm.bold("d") + c.dim(" " + t("btn.delete") + "   ") + c.textWarm.bold("t") + c.dim(" " + t("btn.theme") + "   ") + c.textWarm.bold("r") + c.dim(" " + t("btn.refresh") + "   ") + c.textWarm.bold("l") + c.dim(" lang   ") + c.textWarm.bold("q") + c.dim(" " + t("btn.quit")));
    }
  }

  // ── Step: theme-picker (3-column grid) ──
  if (step.kind === "theme-picker") {
    console.log("  " + chalk.bold.white(t("theme.title")));
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
    console.log("  " + c.textWarm.bold("↑↓←→") + c.dim(" " + t("btn.navigate") + "   ") + c.textWarm.bold("Enter") + c.dim(" " + t("btn.apply") + "   ") + c.error.bold("Esc") + c.dim(" " + t("btn.back")));
  }

  // ── Step: editing / adding ──
  if (step.kind === "editing" || step.kind === "adding") {
    const title = step.kind === "editing" ? t("form.edit") : t("form.add");
    console.log("  " + chalk.bold.white("── " + title + " ──"));
    console.log();
    for (let i = 0; i < step.fields.length; i++) {
      const f = step.fields[i]!;
      const hl = i === step.fieldIndex;
      const arrow = hl ? c.brand.bold("❯") : " ";
      const label = (hl ? c.brand : c.muted)((f.label + ":").padEnd(14));

      const dhcpOn = step.fields.find((x) => x.key === "useDhcp")?.value !== "false";
      const autoFields = ["gateway", "staticIp", "subnetMask", "dns"];
      let displayVal: string;
      if (f.key === "useDhcp") {
        displayVal = dhcpIcon(f.value);
      } else if (dhcpOn && autoFields.includes(f.key) && !f.value) {
        displayVal = c.success(t("field.autoDhcp"));
      } else if (hl) {
        displayVal = f.value + c.brand("█"); // cursor
      } else {
        displayVal = f.value || c.dim(f.placeholder);
      }
      console.log(`  ${arrow} ${label}${displayVal}`);
    }
    console.log();
    console.log("  " + c.divider("─".repeat(54)));
    console.log("  " + c.textWarm.bold("↑↓") + c.dim(" " + t("btn.field") + "   ") + c.textWarm.bold("Tab") + c.dim(" " + t("btn.next") + "   ") + c.brand.bold("⌫") + c.dim(" " + t("btn.delete")));
    console.log("  " + c.textWarm.bold("Space") + c.dim(" " + t("btn.toggle") + "   ") + c.textWarm.bold("Enter") + c.dim(" " + t("btn.save") + "   ") + c.error.bold("Esc") + c.dim(" " + t("btn.cancel")));
  }

  // ── Step: switching ──
  if (step.kind === "switching") {
    console.log("  " + chalk.bold.white(`── ${t("switch.title")} ──`));
    console.log();
    console.log("  " + c.muted(t("switch.target") + " ") + c.textWarm.bold(`${step.profile.name}  ${c.textCool("→")}  ${step.profile.gateway}`));
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
      console.log("  " + c.success.bold(`── ${t("msg.switchComplete")} ──`));
      console.log();
      console.log("    " + c.success.bold("✓") + "  " + c.success(t("msg.switchSuccess")));
      console.log();
      console.log(`    ${c.muted(t("status.gateway"))}  ${c.brand.bold(step.profile.gateway)}  ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(step.profile.name.toUpperCase())} `)}`);
      for (const h of ["google.com", "github.com", "baidu.com", "bilibili.com"]) {
        const r = h === "google.com" ? tcpTest(h, 3) : pingTest(h, 2, 3);
        const clr = r.success ? c.success : c.error;
        const ico = r.success ? c.success("✓") : c.error("✗");
        console.log(`    ${c.muted("Ping".padEnd(10))}${c.textCool(h.padEnd(10))} ${clr(`${r.avg}ms`.padStart(5))} ${ico}`);
      }
    } else {
      console.log("  " + c.error.bold(`── ${t("msg.switchFailed")} ──`));
      console.log();
      console.log("    " + c.error.bold("✗") + "  " + c.error(t("msg.switchFailMsg")));
      if (step.error) console.log(`    ${c.dim(step.error)}`);
      console.log();
      console.log("  " + c.dim(t("msg.autoReverted")));
    }
    console.log();
    console.log("  " + c.dim(t("msg.pressKey")));
  }

  console.log();
}

// ── Switch execution ─────────────────────────────────────────────

async function executeSwitch(profile: Profile) {
  const isPureDhcp = profile.useDhcp && !profile.gateway;
  const stages: StageState[] = isPureDhcp
    ? [
        { label: t("stage.snapshot"), status: "pending" },
        { label: t("stage.switchDhcp"), status: "pending" },
        { label: t("stage.dhcpLease"), status: "pending" },
        { label: `${t("stage.verify")} (${profile.testTarget})`, status: "pending" },
      ]
    : [
        { label: t("stage.snapshot"), status: "pending" },
        { label: t("stage.deleteRoute"), status: "pending" },
        { label: `${t("stage.addRoute")} (${profile.gateway})`, status: "pending" },
        { label: t("stage.service"), status: "pending" },
        { label: `${t("stage.verify")} (${profile.testTarget})`, status: "pending" },
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
    if (isPureDhcp) {
      stages[1]!.status = "running"; await render();
      await switchGateway(profile);
      stages[1]!.status = "done"; await render();
      // Poll for new IP (up to 10s)
      stages[2]!.status = "running"; await render();
      for (let attempt = 0; attempt < 20; attempt++) {
        await sleep(500);
        const ns = getCurrentStatus();
        if (ns.localIp && ns.gateway && ns.localIp !== "0.0.0.0") {
          stages[2]!.status = "done";
          stages[2]!.detail = ns.localIp;
          break;
        }
      }
      if (stages[2]!.status === "running") {
        stages[2]!.status = "done";
        stages[2]!.detail = "timeout";
      }
      await render();
      stages[3]!.status = "running"; await render();
    } else {
      stages[1]!.status = "running"; await render(); await sleep(200);
      stages[1]!.status = "done"; await render();
      stages[2]!.status = "running"; await render();
      await switchGateway(profile);
      stages[2]!.status = "done"; await render();
      stages[3]!.status = "done"; await render();
      // DHCP needs more time for DNS after network change
      await sleep(profile.useDhcp ? 3500 : 1500);
      stages[4]!.status = "running"; await render();
    }
    const pingIdx = isPureDhcp ? 3 : 4;
    const target = profile.testTarget || "google.com";
    const r = target === "google.com" ? tcpTest(target, 3) : pingTest(target, 2, 3);
    stages[pingIdx]!.status = r.success ? "done" : "failed";
    stages[pingIdx]!.detail = r.success ? `${r.avg}ms` : t("stage.noResponse");
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
        // Space toggles DHCP — clear DNS when switching to DHCP
        field.value = field.value === "false" ? "true" : "false";
        if (field.value === "true") {
          const dnsField = step.fields.find((x) => x.key === "dns");
          if (dnsField) dnsField.value = "";
        }
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
      } else if (data === "l") {
        const newLang: "en" | "zh" = getLang() === "en" ? "zh" : "en";
        setLang(newLang);
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
    console.log("\n" + getColors().dim(t("exit.cancelled")));
    process.exit(0);
  });
}

// ── Public entry ─────────────────────────────────────────────────

export async function startInteractive(): Promise<void> {
  const config = loadConfig();
  profiles = getProfiles();
  settings = config.settings;
  setTheme(settings.theme);
  setLang(settings.language as "en" | "zh");

  const c = getColors();
  await render();

  // Check first run — only auto-detect if config file truly doesn't exist
  const configPath = join(homedir(), ".config", "wmnet", "profiles.yaml");
  const isFirstRun = !existsSync(configPath);
  if (isFirstRun && profiles.length === 0) {
    console.log("  " + c.warn("⚠") + "  " + c.textWarm(t("msg.noProfiles")));
    console.log();
    const current = getCurrentStatus();
    status = current;
    if (current.gateway && current.serviceName) {
      const defaultProfile: Profile = {
        id: "default", name: "My Gateway", gateway: current.gateway,
        useDhcp: current.dhcp, dns: current.dns,
        description: t("field.autoDhcp"), order: 0,
        testTarget: "google.com", color: "cyan",
      };
      config.profiles = [defaultProfile];
      saveConfig(config);
      profiles = [defaultProfile];
      settings = config.settings;
      console.log("  " + c.success("✓") + c.text(` ${t("msg.firstFound")}: ${current.serviceName} (${current.interfaceName ?? ""}) → ${current.gateway}`));
      console.log();
      console.log("  " + c.dim(t("msg.firstCreated")));
      console.log("  " + c.dim(t("msg.firstEdit")));
    } else {
      console.log("  " + c.error("✗") + "  " + c.text(t("msg.noNetwork")));
      console.log("  " + c.dim(t("msg.addManually")));
    }
    console.log();
  } else if (!isFirstRun && profiles.length === 0) {
    // File exists but parsing failed — warn, don't overwrite
    console.log("  " + c.error("✗") + "  " + c.text(t("msg.configCorrupted")));
    console.log("  " + c.dim(t("msg.checkConfig")));
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
