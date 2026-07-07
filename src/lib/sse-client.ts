// Global SSE connection + BroadcastChannel for tab sync

type EventHandler = (data: unknown) => void;

let eventSource: EventSource | null = null;
let channel: BroadcastChannel | null = null;
const sseHandlers = new Map<string, Set<EventHandler>>();
const tabHandlers = new Map<string, Set<EventHandler>>();

function initChannel() {
  if (channel) return;

  channel = new BroadcastChannel("app-updates");

  channel.onmessage = (event) => {
    const { type, data } = event.data;
    const handlers = tabHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  };
}

function connect() {
  if (eventSource) {
    console.log("[SSE] Already connected");
    return;
  }

  console.log("[SSE] Connecting");
  const source = new EventSource("/api/dashboard/subscribe");

  let isOpen = false;

  source.onopen = () => {
    isOpen = true;
    console.log("[SSE] Connected");
  };

  const handleEvent = (eventType: string) => {
    return (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        console.log(`[SSE] Got ${eventType}`);

        // Call local handlers
        const handlers = sseHandlers.get(eventType);
        if (handlers) {
          for (const handler of handlers) {
            handler(data);
          }
        }

        // Broadcast to other tabs
        if (channel) {
          channel.postMessage({ type: eventType, data });
        }
      } catch (err) {
        console.error(`[SSE] Parse error for ${eventType}:`, err);
      }
    };
  };

  source.addEventListener("init", handleEvent("init"));
  source.addEventListener("stats-refresh", handleEvent("stats-refresh"));
  source.addEventListener("post-status-update", handleEvent("post-status-update"));

  source.onerror = () => {
    if (isOpen) {
      console.log("[SSE] Connection closed, reconnecting in 3s");
    } else {
      console.log("[SSE] Connection failed");
    }
    source.close();
    eventSource = null;
    setTimeout(connect, 3000);
  };

  eventSource = source;
}

export function addEventListener(type: string, handler: EventHandler): () => void {
  if (!sseHandlers.has(type)) {
    sseHandlers.set(type, new Set());
  }
  sseHandlers.get(type)?.add(handler);

  if (!eventSource) {
    connect();
  }

  return () => {
    sseHandlers.get(type)?.delete(handler);
  };
}

export function onTabMessage(type: string, handler: EventHandler): () => void {
  initChannel();

  if (!tabHandlers.has(type)) {
    tabHandlers.set(type, new Set());
  }
  tabHandlers.get(type)?.add(handler);

  return () => {
    tabHandlers.get(type)?.delete(handler);
  };
}

// Initialize BroadcastChannel on module load (client-side only)
if (typeof window !== "undefined") {
  initChannel();
}
