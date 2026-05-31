#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { startInteractive } from "./app";
import {
  loadConfig,
  getProfiles,
  getProfile,
  addProfile,
  updateProfile,
  removeProfile,
  updateSettings,
  getSettings,
  saveConfig,
} from "./config";
import { getCurrentStatus, switchGateway } from "./network";
import { captureState, undoLastSwitch } from "./undo";
import { pingTest } from "./connectivity";
import { getColors, setTheme, getThemeNames } from "./theme";
import { ProfileSchema } from "./types";

const program = new Command();

program
  .name("wmnet")
  .alias("net-switcher")
  .description("macOS network gateway switcher")
  .version("1.0.0");

// ── status ──
program
  .command("status")
  .description("Show current network status")
  .action(() => {
    const c = getColors();
    const s = getCurrentStatus();
    const profiles = getProfiles();
    const match = profiles.find((p) => p.gateway === s.gateway);

    console.log();
    console.log("  " + chalk.bold.white("Current Status"));
    console.log("  " + c.dim("─".repeat(33)));
    console.log(`  ${c.muted("Local IP".padEnd(12))}${c.text(s.localIp ?? "unknown")}`);
    let ifLine = `  ${c.muted("Interface".padEnd(12))}${c.text(s.serviceName ?? "unknown")} ${c.dim(`(${s.interfaceName ?? "?"})`)}`;
    if (s.ssid) ifLine += `  ${c.dim("⌿")} ${c.textCool(s.ssid)}`;
    console.log(ifLine);
    let gwLine = `  ${c.muted("Gateway".padEnd(12))}${c.brand.bold(s.gateway ?? "unknown")}`;
    if (match) {
      gwLine += `   ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(match.name.toUpperCase())} `)}`;
    }
    console.log(gwLine);
    const dnsOk = s.dns.length > 0 ? c.success("●") : c.error("●");
    console.log(`  ${c.muted("DNS".padEnd(12))}${dnsOk} ${c.text(s.dns.join(", ") || "none")}`);
    console.log("  " + c.dim("─".repeat(33)));
    console.log();
    process.exit(0);
  });

// ── switch ──
program
  .command("switch [profile]")
  .description("Switch to a gateway profile (name or ID)")
  .action(async (profileId?: string) => {
    const c = getColors();

    if (!profileId) {
      // No profile specified → launch interactive mode
      await startInteractive();
      return;
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ Profile "${profileId}" not found`));
      console.log(c.dim("Use 'wmnet list' to see available profiles"));
      process.exit(1);
    }

    console.log();
    console.log("  " + chalk.bold.white(`── Switching to ${profile.name} ──`));
    console.log();

    const current = getCurrentStatus();
    if (current.gateway && current.serviceName) {
      captureState(current.gateway, current.serviceName, current.dns, current.dhcp, current.localIp ?? undefined);
      console.log("  " + c.success("✓") + c.text("  Snapshot saved"));
    }

    try {
      console.log("  " + c.brand("◌") + c.textWarm("  Switching..."));
      await switchGateway(profile);
      console.log("  " + c.success("✓") + c.text("  Gateway switched"));

      await new Promise(r => setTimeout(r, 1500)); // settle
      const targets = [
        { host: "8.8.8.8", label: "Google" },
        { host: "github.com", label: "GitHub" },
        { host: "baidu.com", label: "Baidu" },
        { host: "bilibili.com", label: "Bilibili" },
      ];
      for (const t of targets) {
        const r = await pingTest(t.host, 2, 3);
        const color = r.success ? c.success : c.error;
        console.log(`  ${c.success("✓")}${c.text(`  ${t.label.padEnd(10)} ${color(`${r.avg.toFixed(0)}ms`.padStart(5))}`)}`);
      }
      console.log();
      console.log("  " + c.success.bold("── Switch Complete ──"));
    } catch (e) {
      console.log("  " + c.error("✗") + c.text(`  ${(e as Error).message}`));
      console.log("  " + c.warn("⟲") + c.dim("  Attempting undo..."));
      await undoLastSwitch();
    }
    console.log();
    process.exit(0);
  });

// ── list ──
program
  .command("list")
  .description("List all gateway profiles")
  .action(() => {
    const c = getColors();
    const profiles = getProfiles();
    const status = getCurrentStatus();

    console.log();
    console.log("  " + chalk.bold.white("Profiles"));
    console.log();

    for (const p of profiles) {
      const active = p.gateway === status.gateway;
      const mark = active ? "  " + c.success.bold("◀ active") : "";
      console.log(`  ${c.text(p.name.padEnd(26))} ${c.textCool(p.gateway)}${mark}`);
      if (p.description) {
        console.log(`    ${c.dim(p.description)}`);
      }
      console.log();
    }
    process.exit(0);
  });

// ── add ──
program
  .command("add")
  .description("Quick-add a gateway profile")
  .option("--name <name>", "Profile display name")
  .option("--gateway <ip>", "Gateway IP address")
  .option("--dns <servers>", "Comma-separated DNS servers")
  .option("--desc <description>", "Description")
  .option("--dhcp", "Use DHCP", true)
  .option("--static", "Use static IP (implies --no-dhcp)")
  .option("--static-ip <ip>", "Static IP address")
  .option("--subnet <mask>", "Subnet mask")
  .action(async (opts) => {
    const c = getColors();

    if (!opts.name || !opts.gateway) {
      console.log(c.error("✗ --name and --gateway are required"));
      console.log(c.dim("Example: wmnet add --name \"Home\" --gateway 192.168.1.1"));
      process.exit(1);
    }

    const id = (opts.name as string).toLowerCase().replace(/\s+/g, "-");
    const dns = opts.dns ? (opts.dns as string).split(",").map((s) => s.trim()) : [];

    const profile = {
      id,
      name: opts.name as string,
      gateway: opts.gateway as string,
      useDhcp: !opts.static,
      staticIp: opts.staticIp as string | undefined,
      subnetMask: opts.subnet as string | undefined,
      dns,
      description: (opts.desc as string) ?? "",
      testTarget: "8.8.8.8",
      color: "cyan",
      order: getProfiles().length,
    };

    try {
      ProfileSchema.parse(profile);
      addProfile(profile);
      console.log(c.success(`✓ Profile "${profile.name}" added`));
      console.log(c.dim("Use 'wmnet' to switch gateways"));
    } catch (e: any) {
      console.log(c.error(`✗ Invalid profile: ${e.message}`));
      process.exit(1);
    }
  });

// ── edit ──
program
  .command("edit [profile]")
  .description("Edit a gateway profile")
  .option("--name <name>", "New display name")
  .option("--gateway <ip>", "New gateway IP")
  .option("--desc <description>", "New description")
  .option("--dns <servers>", "New DNS servers (comma-separated)")
  .option("--no-dhcp", "Disable DHCP (use static IP)")
  .option("--static-ip <ip>", "Static IP address")
  .option("--subnet <mask>", "Subnet mask")
  .action(async (profileId?: string, opts?: any) => {
    const c = getColors();
    if (!profileId) {
      console.log(c.error("✗ Profile name or ID required"));
      process.exit(1);
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ Profile "${profileId}" not found`));
      process.exit(1);
    }

    const updates: Record<string, any> = {};
    if (opts?.name) updates.name = opts.name;
    if (opts?.gateway) updates.gateway = opts.gateway;
    if (opts?.desc !== undefined) updates.description = opts.desc;
    if (opts?.dns) updates.dns = (opts.dns as string).split(",").map((s) => s.trim());
    if (opts?.dhcp === false) updates.useDhcp = false;
    if (opts?.staticIp) updates.staticIp = opts.staticIp;
    if (opts?.subnet) updates.subnetMask = opts.subnet;

    if (Object.keys(updates).length === 0) {
      console.log(c.warn("No updates specified"));
      process.exit(0);
    }

    updateProfile(profile.id, updates);
    console.log(c.success(`✓ Profile "${profile.id}" updated`));
    process.exit(0);
  });

// ── delete ──
program
  .command("delete [profile]")
  .description("Delete a gateway profile")
  .action(async (profileId?: string) => {
    const c = getColors();
    if (!profileId) {
      console.log(c.error("✗ Profile name or ID required"));
      process.exit(1);
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ Profile "${profileId}" not found`));
      process.exit(1);
    }

    removeProfile(profile.id);
    console.log(c.success(`✓ Profile "${profile.name}" deleted`));
    process.exit(0);
  });

// ── undo ──
program
  .command("undo")
  .description("Revert to the previous gateway")
  .action(async () => {
    const c = getColors();
    console.log();
    const result = await undoLastSwitch();
    if (result.success) {
      console.log("  " + c.success("✓") + "  " + c.text(result.message));
    } else {
      console.log("  " + c.error("✗") + "  " + c.text(result.message));
    }
    console.log();
    process.exit(result.success ? 0 : 1);
  });

// ── settings ──
program
  .command("settings")
  .description("View or change settings")
  .option("--confirm <bool>", "Enable/disable confirmation before switch (true/false)")
  .option("--theme <name>", `Set theme (${getThemeNames().join("/")})`)
  .action(async (opts) => {
    const c = getColors();
    const settings = getSettings();

    if (opts.confirm !== undefined) {
      const val = opts.confirm === "true" || opts.confirm === true;
      updateSettings({ confirmBeforeSwitch: val });
      console.log(c.success(`✓ confirmBeforeSwitch = ${val}`));
    }
    if (opts.theme) {
      if (setTheme(opts.theme)) {
        updateSettings({ theme: opts.theme as any });
        console.log(c.success(`✓ Theme set to "${opts.theme}"`));
      } else {
        console.log(c.error(`✗ Unknown theme "${opts.theme}"`));
        console.log(c.dim("Available: " + getThemeNames().join(" ")));
      }
    }

    if (!opts.confirm && !opts.theme) {
      console.log();
      console.log("  " + chalk.bold.white("Settings"));
      console.log("  " + c.dim("─".repeat(24)));
      console.log(`  ${c.muted("confirmBeforeSwitch")}  ${c.text(String(settings.confirmBeforeSwitch))}`);
      console.log(`  ${c.muted("autoTest")}            ${c.text(String(settings.autoTestAfterSwitch))}`);
      console.log(`  ${c.muted("theme")}               ${c.brand(settings.theme)}`);
      console.log();
    }
    process.exit(0);
  });

// ── theme ──
program
  .command("theme [name]")
  .description("Set or view color theme")
  .action(async (name?: string) => {
    const c = getColors();
    if (!name) {
      const settings = getSettings();
      console.log(`  Current theme: ${c.brand(settings.theme)}`);
      console.log(`  Available: ${c.dim(getThemeNames().join(" "))}`);
      process.exit(0);
    }
    if (setTheme(name)) {
      updateSettings({ theme: name as any });
      console.log(c.success(`✓ Theme set to "${name}"`));
    } else {
      console.log(c.error(`✗ Unknown theme "${name}"`));
    }
    process.exit(0);
  });

// ── Default: interactive mode ──
program.action(async () => {
  // Load theme setting
  const config = loadConfig();
  setTheme(config.settings.theme);
  await startInteractive();
});

program.parse();
