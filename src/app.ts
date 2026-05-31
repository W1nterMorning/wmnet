import chalk from "chalk";
import { getLogo } from "./logo";
import { getColors, setTheme, getTheme } from "./theme";
import { loadConfig, getProfiles, saveConfig } from "./config";
import { getCurrentStatus, switchGateway } from "./network";
import { captureState, undoLastSwitch, hasUndoState } from "./undo";
import { pingTest, pingStream } from "./connectivity";
import type {
  Profile,
  AppStep,
  StageState,
  NetworkStatus,
  Settings,
} from "./types";

let status: NetworkStatus | null = null;
let profiles: Profile[] = [];
let step: AppStep = { kind: "loading" };
let settings: Settings;

function abort() {
  process.stdout.write("\n");
  process.exit(0);
}

// ── Render ────────────────────────────────────────────────────────

async function render() {
  console.clear();
  const c = getColors();
  const logo = getLogo();

  // Logo
  for (let i = 0; i < logo.lines.length; i++) {
    console.log("  " + logo.colors[i]!(logo.lines[i]!));
  }
  console.log("  " + c.dim("gateway switcher for macOS"));
  console.log();
  console.log("  " + c.divider("─".repeat(50)));
  console.log();

  // Status card
  if (status) {
    console.log("  " + chalk.bold.white("Current Status"));
    console.log("  " + c.dim("─".repeat(33)));

    const gwIp = status.gateway ?? "unknown";
    const dnsOk = status.dns.length > 0 ? c.success("●") : c.error("●");

    console.log(
      `  ${c.muted("Local IP".padEnd(12))}${c.text(status.localIp ?? "unknown")}`,
    );
    const ifStr = status.serviceName ?? "unknown";
    const ifExtra = status.interfaceName ? c.dim(` (${status.interfaceName})`) : "";
    console.log(
      `  ${c.muted("Interface".padEnd(12))}${c.text(ifStr)}${ifExtra}`,
    );

    // Gateway + matching profile badge
    const match = profiles.find((p) => p.gateway === status.gateway);
    let gwLine = `  ${c.muted("Gateway".padEnd(12))}${c.brand.bold(gwIp)}`;
    if (match) {
      gwLine += `   ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(match.name.toUpperCase())} `)}`;
    }
    console.log(gwLine);

    console.log(
      `  ${c.muted("DNS".padEnd(12))}${dnsOk} ${c.text(status.dns.join(", ") || "none")}`,
    );
    console.log("  " + c.dim("─".repeat(33)));
    console.log();
  }

  // ── Step-dependent content ──
  if (step.kind === "loading") {
    console.log("  " + c.brand("◌") + c.textWarm("  Loading network status..."));
  }

  if (step.kind === "selecting" || step.kind === "confirming") {
    console.log("  " + chalk.bold.white("Profiles"));
    console.log();

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i]!;
      const hl = i === step.highlightIndex;
      const isActive = p.gateway === status?.gateway;

      const arrow = hl ? c.brand.bold("❯") : " ";
      const name = hl
        ? c.brand.bold(p.name.padEnd(26))
        : c.text(p.name.padEnd(26));
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
      console.log(
        "  " + c.textWarm.bold(`Switch to "${p.name}" (${p.gateway})?`),
      );
      console.log(
        "  " +
          c.textWarm.bold("Enter") +
          c.dim(" = Confirm    ") +
          c.error.bold("Esc") +
          c.dim(" = Cancel"),
      );
      console.log();
      console.log("  " + c.divider("─".repeat(54)));
    } else {
      console.log(
        "  " +
          c.textWarm.bold("↑↓") +
          c.dim(" move   ") +
          c.textWarm.bold("Enter") +
          c.dim(" select   ") +
          c.textWarm.bold("1-9") +
          c.dim(" quick   ") +
          c.textWarm.bold("a") +
          c.dim(" add   ") +
          c.textWarm.bold("e") +
          c.dim(" edit"),
      );
      console.log(
        "  " +
          c.textWarm.bold("d") +
          c.dim(" delete   ") +
          c.textWarm.bold("t") +
          c.dim(" theme   ") +
          c.textWarm.bold("u") +
          c.dim(" undo   ") +
          c.textWarm.bold("q") +
          c.dim(" quit"),
      );
    }
  }

  if (step.kind === "switching") {
    console.log("  " + chalk.bold.white("── Switching Gateway ──"));
    console.log();
    console.log(
      "  " +
        c.muted("Target ") +
        c.textWarm.bold(
          `${step.profile.name}  ${c.textCool("→")}  ${step.profile.gateway}`,
        ),
    );
    console.log();

    for (const s of step.stages) {
      let icon: string;
      let style: (x: string) => string;
      let label: (x: string) => string;
      if (s.status === "done") {
        icon = "✓";
        style = c.success;
        label = c.text;
      } else if (s.status === "running") {
        icon = "◌";
        style = c.brand;
        label = c.textWarm;
      } else if (s.status === "failed") {
        icon = "✗";
        style = c.error;
        label = c.error;
      } else {
        icon = "·";
        style = c.dim;
        label = c.dim;
      }

      let line = `    ${style(icon)}  ${label(s.label)}`;
      if (s.detail && s.status === "done") {
        line += `  ${c.dim(`(${s.detail})`)}`;
      }
      if (s.detail && s.status === "failed") {
        line += `\n      ${c.error(s.detail)}`;
      }
      console.log(line);
    }
    console.log();
  }

  if (step.kind === "done") {
    if (step.success) {
      console.log("  " + c.success.bold("── Switch Complete ──"));
      console.log();
      console.log(
        "    " + c.success.bold("✓") + "  " + c.success("Gateway switched successfully"),
      );
      console.log();
      console.log(
        `    ${c.muted("Gateway")}  ${c.brand.bold(step.profile.gateway)}  ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(step.profile.name.toUpperCase())} `)}`,
      );

      // Ping result
      const pingResult = await pingTest(step.profile.testTarget, 3, settings.testTimeoutSeconds);
      const pingColor =
        pingResult.lossPercent === 0
          ? c.success
          : pingResult.lossPercent < 50
            ? c.warn
            : c.error;
      console.log(
        `    ${c.muted("Ping")}     ${c.text(step.profile.testTarget)}  ${pingColor(`${pingResult.avg.toFixed(1)}ms`)} ${pingResult.success ? c.success("✓") : c.error("✗")}`,
      );
    } else {
      console.log("  " + c.error.bold("── Switch Failed ──"));
      console.log();
      console.log(
        "    " + c.error.bold("✗") + "  " + c.error("Gateway switch failed"),
      );
      if (step.error) {
        console.log(`    ${c.dim(step.error)}`);
      }
      console.log();
      console.log("  " + c.dim("Gateway automatically reverted."));
    }
    console.log();
    console.log("  " + c.dim("Press any key to exit..."));
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

  // Save undo snapshot
  const start = Date.now();
  const current = getCurrentStatus();
  if (current.gateway && current.serviceName) {
    captureState(
      current.gateway,
      current.serviceName,
      current.dns,
      current.dhcp,
      current.localIp ?? undefined,
      undefined,
    );
  }
  stages[0]!.status = "done";
  stages[0]!.detail = `${Date.now() - start}ms`;
  await render();

  // Perform switch with stage-by-stage updates
  try {
    stages[1]!.status = "running";
    await render();
    await sleep(200);
    stages[1]!.status = "done";
    await render();

    stages[2]!.status = "running";
    await render();
    await switchGateway(profile);
    stages[2]!.status = "done";
    await render();

    stages[3]!.status = "done"; // service update included in switchGateway
    await render();

    stages[4]!.status = "running";
    await render();
    const pingResult = await pingTest(profile.testTarget, 3, settings.testTimeoutSeconds);
    stages[4]!.status = pingResult.success ? "done" : "failed";
    stages[4]!.detail = pingResult.success ? `${pingResult.avg.toFixed(1)}ms` : "no response";
    await render();

    step = { kind: "done", profile, success: true };
  } catch (e) {
    // Auto-undo on failure
    const msg = (e as Error).message;
    stages.find((s) => s.status === "running")!.status = "failed";
    await render();
    await sleep(500);

    try {
      await undoLastSwitch();
      step = { kind: "done", profile, success: false, error: msg };
    } catch {
      step = { kind: "done", profile, success: false, error: `${msg}\nAuto-undo also failed` };
    }
  }
  await render();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── stdin handling ───────────────────────────────────────────────

function setupInput() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (data: string) => {
    const key = data;
    const c = getColors();

    if (step.kind === "done") {
      abort();
    }

    if (step.kind === "loading") {
      // wait for data
      return;
    }

    if (step.kind === "selecting") {
      if (key === "\x1b[A" || key === "k") {
        step.highlightIndex = Math.max(0, step.highlightIndex - 1);
        await render();
      } else if (key === "\x1b[B" || key === "j") {
        step.highlightIndex = Math.min(
          profiles.length - 1,
          step.highlightIndex + 1,
        );
        await render();
      } else if (key === "\r") {
        if (settings.confirmBeforeSwitch) {
          step = { kind: "confirming", highlightIndex: step.highlightIndex };
          await render();
        } else {
          const p = profiles[step.highlightIndex];
          if (p && p.gateway !== status?.gateway) {
            await executeSwitch(p);
          }
        }
      } else if (key === "q" || key === "\x1b") {
        abort();
      } else if (key === "u") {
        const result = await undoLastSwitch();
        console.clear();
        console.log(`  ${result.success ? c.success("✓") : c.error("✗")} ${result.message}`);
        process.exit(result.success ? 0 : 1);
      } else if (key >= "1" && key <= "9") {
        const idx = parseInt(key) - 1;
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
    } else if (step.kind === "confirming") {
      if (key === "\r") {
        const p = profiles[step.highlightIndex];
        if (p) await executeSwitch(p);
      } else if (key === "\x1b") {
        step = { kind: "selecting", highlightIndex: step.highlightIndex };
        await render();
      }
    }
  });

  // Handle Ctrl+C gracefully
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

  // Check first run
  if (profiles.length === 0) {
    console.log(
      "  " + c.warn("⚠") + "  " + c.textWarm("No profiles found. Auto-detecting current network..."),
    );
    console.log();

    const current = getCurrentStatus();
    status = current;

    if (current.gateway && current.serviceName) {
      const defaultProfile: Profile = {
        id: "default",
        name: "My Gateway",
        gateway: current.gateway,
        useDhcp: current.dhcp,
        dns: current.dns,
        description: "Auto-detected default gateway",
        order: 0,
        testTarget: "8.8.8.8",
        color: "cyan",
      };
      config.profiles = [defaultProfile];
      saveConfig(config);
      profiles = [defaultProfile];
      settings = config.settings;

      console.log(
        "  " +
          c.success("✓") +
          c.text(
            ` Found: ${current.serviceName} (${current.interfaceName ?? ""}) → ${current.gateway}`,
          ),
      );
      console.log();
      console.log("  " + c.dim("Created default profile: \"My Gateway\""));
      console.log(
        "  " + c.dim("You can edit it later with:  wmnet edit default"),
      );
    } else {
      console.log("  " + c.error("✗") + "  " + c.text("Could not detect network."));
      console.log(
        "  " + c.dim("Please add a profile manually:  wmnet add"),
      );
    }
    console.log();
  } else {
    status = getCurrentStatus();
  }

  setupInput();
  step = { kind: "selecting", highlightIndex: 0 };
  await render();
}
