export const AUTH_FLOW_STORAGE_KEY = "lendfolio:auth-flow-completed";

export type AuthFlowCompleted = "email-confirmed" | "password-reset-opened";

export function publishAuthFlowCompleted(flow: AuthFlowCompleted) {
  const value = JSON.stringify({ flow, completedAt: Date.now() });
  window.localStorage.setItem(AUTH_FLOW_STORAGE_KEY, value);

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(AUTH_FLOW_STORAGE_KEY);
    channel.postMessage(flow);
    channel.close();
  }
}

