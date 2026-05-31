import { execSync } from "node:child_process";
import type { Profile, NetworkStatus } from "./types";

function exec(cmd: string, timeout = 5000): string {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: any) {
    return "";
  }
}

export function getCurrentStatus(): NetworkStatus {
  const gateway = getDefaultGateway();
  const serviceName = getNetworkService();
  const localIp = serviceName ? getIPAddress(serviceName) : null;
  const dns = serviceName ? getDNS(serviceName) : [];
  const dhcp = serviceName ? isDHCP(serviceName) : true;
  const ifName = serviceName ? getInterfaceForService(serviceName) : null;
  const ssid = ifName ? getWiFiSSID(ifName) : null;

  return { localIp, gateway, interfaceName: ifName, serviceName, ssid, dns, dhcp };
}

export async function switchGateway(profile: Profile): Promise<void> {
  // Step 1: Delete current default route
  execSync("sudo route delete default", {
    encoding: "utf8",
    timeout: 10000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Step 2: Add new default route
  try {
    execSync(`sudo route add default ${profile.gateway}`, {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: any) {
    throw new Error(`Failed to add route ${profile.gateway}: ${(e.stderr ?? e.message ?? "").trim()}`);
  }

  // Step 3: Update network service
  const service = getNetworkService();
  if (!service) throw new Error("No active network service found");

  if (profile.useDhcp) {
    execSync(`sudo networksetup -setdhcp "${service}"`, {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } else if (profile.staticIp && profile.subnetMask) {
    execSync(
      `sudo networksetup -setmanual "${service}" ${profile.staticIp} ${profile.subnetMask} ${profile.gateway}`,
      {
        encoding: "utf8",
        timeout: 15000,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }

  // Step 4: Set DNS
  if (profile.dns.length > 0) {
    execSync(
      `sudo networksetup -setdnsservers "${service}" ${profile.dns.join(" ")}`,
      {
        encoding: "utf8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }
}

export async function restoreGateway(
  gateway: string,
  serviceName: string,
  dhcp: boolean,
  dns: string[],
  staticIp?: string,
  subnetMask?: string,
): Promise<void> {
  execSync("sudo route delete default", {
    encoding: "utf8",
    timeout: 10000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  execSync(`sudo route add default ${gateway}`, {
    encoding: "utf8",
    timeout: 10000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (dhcp) {
    execSync(`sudo networksetup -setdhcp "${serviceName}"`, {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } else if (staticIp && subnetMask) {
    execSync(
      `sudo networksetup -setmanual "${serviceName}" ${staticIp} ${subnetMask} ${gateway}`,
      {
        encoding: "utf8",
        timeout: 15000,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }

  if (dns.length > 0) {
    execSync(
      `sudo networksetup -setdnsservers "${serviceName}" ${dns.join(" ")}`,
      {
        encoding: "utf8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }
}

// ── Private helpers ──

function getDefaultGateway(): string | null {
  const out = exec("route -n get default 2>/dev/null");
  // macOS 格式: "gateway: 192.168.50.252"
  const match = out.match(/gateway:\s+([\d.]+)/);
  return match?.[1] ?? null;
}

function getNetworkService(): string | null {
  // 1. 找到当前 default route 走的 interface
  const routeOut = exec("route -n get default 2>/dev/null");
  const ifMatch = routeOut.match(/interface:\s+(\S+)/);
  const ifName = ifMatch?.[1] ?? null;
  if (!ifName) return null;

  // 2. 对照 interface → service name
  const portsOut = exec("networksetup -listallhardwareports");
  const lines = portsOut.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes(`Device: ${ifName}`)) {
      // 上一行应该是 "Hardware Port: Wi-Fi"
      const portMatch = lines[i - 1]?.match(/Hardware Port:\s+(.+)/);
      if (portMatch?.[1]) return portMatch[1].trim();
    }
  }

  // Fallback: 返回第一个可用的 service
  const svcOut = exec("networksetup -listallnetworkservices");
  const svcs = svcOut
    .split("\n")
    .slice(1)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("*"));
  return svcs[0] ?? null;
}

function getIPAddress(service: string): string | null {
  const out = exec(`networksetup -getinfo "${service}"`);
  const match = out.match(/^IP address:\s+([\d.]+)/m);
  return match?.[1] ?? null;
}

function getDNS(service: string): string[] {
  const out = exec(`networksetup -getdnsservers "${service}"`);
  if (!out || out.includes("aren't any")) return [];
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^\d+\.\d+\.\d+\.\d+$/.test(s));
}

function isDHCP(service: string): boolean {
  const out = exec(`networksetup -getinfo "${service}"`);
  return out.includes("DHCP Configuration") || out.includes("Manual Configuration") === false;
}

function getInterfaceForService(service: string): string | null {
  const portsOut = exec("networksetup -listallhardwareports");
  const lines = portsOut.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.includes(`Hardware Port: ${service}`)) {
      const devMatch = lines[i + 1]?.match(/Device:\s+(\S+)/);
      if (devMatch?.[1]) return devMatch[1].trim();
    }
  }
  return null;
}

function getWiFiSSID(ifName: string): string | null {
  const out = exec(`networksetup -getairportnetwork ${ifName} 2>/dev/null`);
  const match = out.match(/Current Wi-Fi Network:\s+(.+)/);
  return match?.[1]?.trim() ?? null;
}
