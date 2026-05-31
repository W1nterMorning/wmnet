import { saveUndoState, getUndoState, clearUndoState } from "./config";
import { restoreGateway } from "./network";

export function captureState(
  gateway: string,
  serviceName: string,
  dns: string[],
  dhcp: boolean,
  staticIp?: string,
  subnetMask?: string,
): void {
  saveUndoState({ gateway, serviceName, dns, dhcp, staticIp, subnetMask });
}

export async function undoLastSwitch(): Promise<{
  success: boolean;
  message: string;
}> {
  const state = getUndoState();
  if (!state) {
    return { success: false, message: "No previous switch to undo" };
  }

  try {
    await restoreGateway(
      state.gateway,
      state.serviceName,
      state.dhcp,
      state.dns,
      state.staticIp,
      state.subnetMask,
    );
    clearUndoState();
    return {
      success: true,
      message: `Reverted to ${state.gateway}`,
    };
  } catch (e) {
    return {
      success: false,
      message: `Undo failed: ${(e as Error).message}`,
    };
  }
}

export function hasUndoState(): boolean {
  return getUndoState() !== null;
}
