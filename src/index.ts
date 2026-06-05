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
import { pingTest, tcpTest } from "./connectivity";
import { getColors, setTheme, getThemeNames } from "./theme";
import { t, setLang } from "./i18n";
import { ProfileSchema } from "./types";

const program = new Command();

program
  .name("wmnet")
  .alias("net-switcher")
  .description("macOS network gateway switcher")
  .version("1.0.0")
  .hook("preAction", () => {
    const cfg = loadConfig();
    setTheme(cfg.settings.theme);
    setLang(cfg.settings.language as "en" | "zh");
  });

// ── status ──
program
  .command("status")
  .description(t("cmd.status"))
  .action(() => {
    const c = getColors();
    const s = getCurrentStatus();
    const profiles = getProfiles();
    const match = profiles.find((p) => p.gateway === s.gateway);

    console.log();
    console.log("  " + chalk.bold.white(t("status.title")));
    console.log("  " + c.dim("─".repeat(33)));
    console.log(`  ${c.muted(t("status.localIp").padEnd(12))}${c.text(s.localIp ?? "unknown")}`);
    let ifLine = `  ${c.muted(t("status.interface").padEnd(12))}${c.text(s.serviceName ?? "unknown")} ${c.dim(`(${s.interfaceName ?? "?"})`)}`;
    if (s.ssid) ifLine += `  ${c.dim("⌿")} ${c.textCool(s.ssid)}`;
    console.log(ifLine);
    let gwLine = `  ${c.muted(t("status.gateway").padEnd(12))}${c.brand.bold(s.gateway ?? "unknown")}`;
    if (match) {
      gwLine += `   ${c.brand.bgHex("#1A3A3E")(` ${c.brand.bold(match.name.toUpperCase())} `)}`;
    }
    console.log(gwLine);
    const dnsOk = s.dns.length > 0 ? c.success("●") : (s.dhcp ? c.success("●") : c.error("●"));
    const dnsDisplay = s.dns.length > 0 ? c.text(s.dns.join(", ")) : (s.dhcp ? c.success(t("dns.dhcpAuto")) : c.error(t("dns.none")));
    console.log(`  ${c.muted(t("status.dns").padEnd(12))}${dnsOk} ${dnsDisplay}`);
    console.log("  " + c.dim("─".repeat(33)));
    console.log();
    process.exit(0);
  });

// ── switch ──
program
  .command("switch [profile]")
  .description(t("cmd.switch"))
  .action(async (profileId?: string) => {
    const c = getColors();

    if (!profileId) {
      // No profile specified → launch interactive mode
      await startInteractive();
      return;
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ ${t("cli.notFound")}: "${profileId}"`));
      console.log(c.dim(t("cli.seeList")));
      process.exit(1);
    }

    console.log();
    console.log("  " + chalk.bold.white(`── ` + t("switch.title") + ` ${profile.name} ──`));
    console.log();

    const current = getCurrentStatus();
    if (current.gateway && current.serviceName) {
      captureState(current.gateway, current.serviceName, current.dns, current.dhcp, current.localIp ?? undefined);
      console.log("  " + c.success("✓") + c.text("  " + t("stage.snapshot")));
    }

    try {
      console.log("  " + c.brand("◌") + c.textWarm("  " + t("cli.switching")));
      await switchGateway(profile);
      console.log("  " + c.success("✓") + c.text("  " + t("cli.switched")));

      await new Promise(r => setTimeout(r, 1500)); // settle
      for (const h of ["google.com", "github.com", "baidu.com", "bilibili.com"]) {
        const r = h === "google.com" ? tcpTest(h, 3) : pingTest(h, 2, 3);
        const clr = r.success ? c.success : c.error;
        console.log(`  ${c.success("✓")}${c.text(`  ${h.padEnd(12)} ${clr(`${r.avg}ms`.padStart(5))}`)}`);
      }
      console.log();
      console.log("  " + c.success.bold("── " + t("msg.switchComplete") + " ──"));
    } catch (e) {
      console.log("  " + c.error("✗") + c.text(`  ${(e as Error).message}`));
      console.log("  " + c.warn("⟲") + c.dim("  " + t("cli.undoAttempt")));
      await undoLastSwitch();
    }
    console.log();
    process.exit(0);
  });

// ── list ──
program
  .command("list")
  .description(t("cmd.list"))
  .action(() => {
    const c = getColors();
    const profiles = getProfiles();
    const status = getCurrentStatus();

    console.log();
    console.log("  " + chalk.bold.white(t("profiles.title")));
    console.log();

    for (const p of profiles) {
      const active = p.gateway === status.gateway;
      const mark = active ? "  " + c.success.bold("◀ " + t("profiles.active")) : "";
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
  .description(t("cmd.add"))
  .option("--name <name>", t("opt.name"))
  .option("--gateway <ip>", t("opt.gateway"))
  .option("--dns <servers>", t("opt.dns"))
  .option("--desc <description>", t("opt.desc"))
  .option("--dhcp", t("opt.dhcp"), true)
  .option("--static", t("opt.static"))
  .option("--static-ip <ip>", t("opt.staticip"))
  .option("--subnet <mask>", t("opt.subnet"))
  .action(async (opts) => {
    const c = getColors();

    if (!opts.name || !opts.gateway) {
      console.log(c.error("✗ --name " + t("add.requiredMsg")));
      console.log(c.dim(t("cli.example") + ": wmnet add --name \"Home\" --gateway 192.168.1.1"));
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
      testTarget: "google.com",
      color: "cyan",
      order: getProfiles().length,
    };

    try {
      ProfileSchema.parse(profile);
      addProfile(profile);
      console.log(c.success(`✓ ${t("cli.added")}: "${profile.name}"`));
      console.log(c.dim(t("cli.seeList")));
    } catch (e: any) {
      console.log(c.error(`✗ ${t("cli.invalid")}: ${e.message}`));
      process.exit(1);
    }
  });

// ── edit ──
program
  .command("edit [profile]")
  .description(t("cmd.edit"))
  .option("--name <name>", t("opt.name"))
  .option("--gateway <ip>", t("opt.gateway"))
  .option("--desc <description>", t("opt.desc"))
  .option("--dns <servers>", t("opt.dns"))
  .option("--no-dhcp", t("opt.static"))
  .option("--static-ip <ip>", t("opt.staticip"))
  .option("--subnet <mask>", t("opt.subnet"))
  .action(async (profileId?: string, opts?: any) => {
    const c = getColors();
    if (!profileId) {
      console.log(c.error("✗ " + t("cli.required")));
      process.exit(1);
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ ${t("cli.notFound")}: "${profileId}"`));
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
    console.log(c.success(`✓ ${t("cli.updated")}: "${profile.id}"`));
    process.exit(0);
  });

// ── delete ──
program
  .command("delete [profile]")
  .description(t("cmd.delete"))
  .action(async (profileId?: string) => {
    const c = getColors();
    if (!profileId) {
      console.log(c.error("✗ " + t("cli.required")));
      process.exit(1);
    }

    const profile = getProfile(profileId) ?? getProfiles().find((p) => p.name.toLowerCase().includes(profileId.toLowerCase()));
    if (!profile) {
      console.log(c.error(`✗ ${t("cli.notFound")}: "${profileId}"`));
      process.exit(1);
    }

    removeProfile(profile.id);
    console.log(c.success(`✓ ${t("cli.deleted")}: "${profile.name}"`));
    process.exit(0);
  });

// ── undo ──
program
  .command("undo")
  .description(t("cmd.undo"))
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
  .description(t("cmd.settings"))
  .option("--confirm <bool>", t("opt.confirm"))
  .option("--theme <name>", `Set theme (${getThemeNames().join("/")})`)
  .option("--lang <lang>", t("opt.lang"))
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
        console.log(c.success(`✓ ${t("msg.themeSet")} "${opts.theme}"`));
      } else {
        console.log(c.error(`✗ ${t("msg.themeUnknown")} "${opts.theme}"`));
        console.log(c.dim(t("cli.available") + ": " + getThemeNames().join(" ")));
      }
    }
    if (opts.lang) {
      if (opts.lang === "zh" || opts.lang === "en") {
        setLang(opts.lang as "en" | "zh");
        updateSettings({ language: opts.lang as "en" | "zh" });
        console.log(c.success(`✓ Language set to "${opts.lang}"`));
      } else {
        console.log(c.error(`✗ Unknown language "${opts.lang}"`));
        console.log(c.dim("Available: en, zh"));
      }
    }

    if (!opts.confirm && !opts.theme && !opts.lang) {
      console.log();
      console.log("  " + chalk.bold.white(t("cli.settingsTitle")));
      console.log("  " + c.dim("─".repeat(24)));
      console.log(`  ${c.muted("confirmBeforeSwitch")}  ${c.text(String(settings.confirmBeforeSwitch))}`);
      console.log(`  ${c.muted("autoTest")}            ${c.text(String(settings.autoTestAfterSwitch))}`);
      console.log(`  ${c.muted("theme")}               ${c.brand(settings.theme)}`);
      console.log(`  ${c.muted("language")}           ${c.text(String(settings.language))}`);
      console.log();
    }
    process.exit(0);
  });

// ── theme ──
program
  .command("theme [name]")
  .description(t("cmd.theme"))
  .action(async (name?: string) => {
    const c = getColors();
    if (!name) {
      const settings = getSettings();
      console.log(`  Current theme: ${c.brand(settings.theme)}`);
      console.log(`  ${t("cli.available")}: ${c.dim(getThemeNames().join(" "))}`);
      process.exit(0);
    }
    if (setTheme(name)) {
      updateSettings({ theme: name as any });
      console.log(c.success(`✓ ${t("msg.themeSet")} "${name}"`));
    } else {
      console.log(c.error(`✗ ${t("msg.themeUnknown")} "${name}"`));
    }
    process.exit(0);
  });

// ── Default: interactive mode ──
program.action(async () => {
  // Load theme setting
  const config = loadConfig();
  setTheme(config.settings.theme);
  setLang(config.settings.language as "en" | "zh");
  await startInteractive();
});

program.parse();
