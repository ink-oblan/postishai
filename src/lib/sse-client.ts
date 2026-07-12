// Global SSE connection + BroadcastChannel for tab sync

type EventHandler = (data: unknown) => void;
type EventType = "init" | "stats-refresh" | "post-status-update" | "avatar-status-update";

const DEBUG = typeof window !== "undefined" && process.env.NODE_ENV === "development";

let eventSource: EventSource | null = null;
let channel: BroadcastChannel | null = null;
let reconnectDelay = 1000; // Start with 1 second
const MAX_RECONNECT_DELAY = 30000; // Cap at 30 seconds
const sseHandlers = new Map<string, Set<EventHandler>>();
const tabHandlers = new Map<string, Set<EventHandler>>();

function initChannel() {
  if (channel) return;

  channel = new BroadcastChannel("app-updates");

  channel.onmessage = (event) => {
    const { type, data, _fromSse } = event.data;
    // If this message came from our own SSE connection, ignore it
    // (it's already been handled by addEventListener)
    if (_fromSse) return;

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
    if (DEBUG) console.log("[SSE] Already connected");
    return;
  }

  if (DEBUG) console.log("[SSE] Connecting");
  const source = new EventSource("/api/dashboard/subscribe");

  let isOpen = false;

  source.onopen = () => {
    isOpen = true;
    reconnectDelay = 1000; // Reset backoff on successful connection
    if (DEBUG) console.log("[SSE] Connected");
  };

  const handleEvent = (eventType: string) => {
    return (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        if (DEBUG) console.log(`[SSE] Got ${eventType}`);

        // Call local handlers
        const handlers = sseHandlers.get(eventType);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(data);
            } catch (handlerErr) {
              console.error(`[SSE] Handler error for ${eventType}:`, handlerErr);
            }
          }
        }

        // Broadcast to all tabs (including this one via BroadcastChannel)
        if (channel) {
          try {
            channel.postMessage({ type: eventType, data, _fromSse: true });
          } catch (broadcastErr) {
            console.error(`[SSE] Failed to broadcast ${eventType}:`, broadcastErr);
          }
        }
      } catch (err) {
        console.error(`[SSE] Parse error for ${eventType}:`, err);
      }
    };
  };

  const eventTypes: EventType[] = [
    "init",
    "stats-refresh",
    "post-status-update",
    "avatar-status-update",
  ];
  for (const eventType of eventTypes) {
    source.addEventListener(eventType, handleEvent(eventType));
  }

  source.onerror = () => {
    if (isOpen) {
      if (DEBUG) console.log(`[SSE] Connection closed, reconnecting in ${reconnectDelay}ms`);
    } else {
      if (DEBUG) console.log(`[SSE] Connection failed, reconnecting in ${reconnectDelay}ms`);
    }
    source.close();
    eventSource = null;
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
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
    const handlers = sseHandlers.get(type);
    handlers?.delete(handler);

    if (handlers?.size === 0) {
      const hasAnyHandlers = Array.from(sseHandlers.values()).some((set) => set.size > 0);
      if (!hasAnyHandlers && eventSource) {
        if (DEBUG) console.log("[SSE] No more handlers, closing connection");
        eventSource.close();
        eventSource = null;
      }
    }
  };
}

export function onTabMessage(type: string, handler: EventHandler): () => void {
  initChannel();

  if (!tabHandlers.has(type)) {
    tabHandlers.set(type, new Set());
  }
  tabHandlers.get(type)?.add(handler);

  return () => {
    const handlers = tabHandlers.get(type);
    handlers?.delete(handler);

    if (handlers?.size === 0) {
      const hasAnyTabHandlers = Array.from(tabHandlers.values()).some((set) => set.size > 0);
      if (!hasAnyTabHandlers && channel) {
        if (DEBUG) console.log("[SSE] No more tab listeners, closing BroadcastChannel");
        channel.close();
        channel = null;
      }
    }
  };
}

// Initialize BroadcastChannel on module load (client-side only)
if (typeof window !== "undefined") {
  initChannel();
}
