import { execSync } from "node:child_process";
import type { PingResult } from "./types";

export async function pingTest(
  target: string,
  count = 3,
  timeout = 3,
): Promise<PingResult> {
  const cmd = `ping -c ${count} -t ${timeout} ${target}`;

  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      timeout: (count * 2 + 3) * 1000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 解析统计行
    const statsMatch = out.match(
      /(\d+)\s+packets?\s+transmitted.*?(\d+)\s+packets?\s+received.*?([\d.]+)%\s+packet\s+loss/,
    );
    const rttMatch = out.match(
      /round-trip\s+min\/avg\/max\/stddev\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\//,
    );

    const transmitted = statsMatch?.[1] ? parseInt(statsMatch[1]) : count;
    const received = statsMatch?.[2] ? parseInt(statsMatch[2]) : 0;
    const lossPercent = statsMatch?.[3] ? parseFloat(statsMatch[3]) : 100;
    const min = rttMatch?.[1] ? parseFloat(rttMatch[1]) : 0;
    const avg = rttMatch?.[2] ? parseFloat(rttMatch[2]) : 0;
    const max = rttMatch?.[3] ? parseFloat(rttMatch[3]) : 0;

    return {
      transmitted,
      received,
      lossPercent,
      min,
      avg,
      max,
      success: received > 0,
    };
  } catch {
    return {
      transmitted: count,
      received: 0,
      lossPercent: 100,
      min: 0,
      avg: 0,
      max: 0,
      success: false,
    };
  }
}

