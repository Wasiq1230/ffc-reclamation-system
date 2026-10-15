type CloseHandler = () => boolean | void;

interface HandlerEntry {
  id: string;
  close: CloseHandler;
  priority: number;
}

const handlers: HandlerEntry[] = [];

/**
 * Register a modal, drawer, or bottom sheet close handler.
 * Handlers with higher priority are executed first.
 * Returns an unregister function.
 */
export function registerCloseHandler(id: string, close: CloseHandler, priority = 0): () => void {
  // Remove existing with same id if any
  const existingIdx = handlers.findIndex((h) => h.id === id);
  if (existingIdx !== -1) {
    handlers.splice(existingIdx, 1);
  }

  handlers.push({ id, close, priority });
  // Higher priority first, then latest registered
  handlers.sort((a, b) => b.priority - a.priority);

  return () => {
    const idx = handlers.findIndex((h) => h.id === id);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * Executes the highest priority active modal/overlay close handler.
 * Returns true if an overlay was closed, false otherwise.
 */
export function triggerActiveCloseHandler(): boolean {
  if (handlers.length > 0) {
    const top = handlers.shift();
    if (top) {
      top.close();
      return true;
    }
  }
  return false;
}

export function hasActiveOverlays(): boolean {
  return handlers.length > 0;
}
