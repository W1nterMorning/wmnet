import { execSync } from "node:child_process";

// TCP test for hosts that block ICMP (e.g. google.com behind GFW)
export function tcpTest(host: string, timeout = 3): { success: boolean; avg: number } {
  try {
    const start = Date.now();
    execSync(
      `curl --connect-timeout ${timeout} -s -o /dev/null -w '%{http_code}' https://${host}`,
      { encoding: "utf8", timeout: (timeout + 5) * 1000, stdio: ["ignore", "pipe", "pipe"] },
    );
    return { success: true, avg: Date.now() - start };
  } catch {
    return { success: false, avg: 0 };
  }
}

export function pingTest(host: string, count = 2, timeout = 3): { success: boolean; avg: number } {
  const cmd = `ping -c ${count} -t ${timeout} ${host}`;
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      timeout: (count * 2 + 3) * 1000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const statsMatch = out.match(/(\d+)\s+packets?\s+transmitted.*?(\d+)\s+packets?\s+received/);
    const rttMatch = out.match(/round-trip\s+min\/avg\/max\/stddev\s*=\s*[\d.]+\/([\d.]+)\//);
    const received = statsMatch?.[2] ? parseInt(statsMatch[2]) : 0;
    const avg = rttMatch?.[1] ? Math.round(parseFloat(rttMatch[1])) : 0;
    return { success: received > 0, avg };
  } catch {
    return { success: false, avg: 0 };
  }
}
