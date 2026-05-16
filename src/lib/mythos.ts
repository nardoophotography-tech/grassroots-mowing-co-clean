export class MythosDebug {
  enabled: boolean;
  logs: any[];

  constructor() {
    this.enabled = true;
    this.logs = [];
  }

  log(type: string, tag: string, data?: any) {
    if (!this.enabled) return;

    // Prune data if it is an object to avoid circular structures early
    const sanitizedData = this.sanitize(data);

    const entry = {
      time: new Date().toISOString(),
      type,
      tag,
      data: sanitizedData
    };

    this.logs.push(entry);

    console.log(`[MYTHOS ${type}] ${tag}`, sanitizedData || "");

    // Optional: persist last 200 logs only
    if (this.logs.length > 200) {
      this.logs.shift();
    }
  }

  // Defensive sanitization helper to strip non-serializable values
  public sanitize(val: any, cache = new Set()): any {
    if (val === null || typeof val === 'undefined') return val;
    if (typeof val !== 'object') return val;
    
    // Handle specific primitive wrappers if they somehow got here
    if (val instanceof Date) return val.toISOString();
    if (val instanceof RegExp) return val.toString();

    // Check circularity
    if (cache.has(val)) return '[Circular]';
    cache.add(val);

    // Protect against DOM nodes - more robust check
    if (
      (typeof Node !== 'undefined' && val instanceof Node) ||
      (val.nodeType && typeof val.nodeName === 'string')
    ) {
      return `[DOM Node: ${val.nodeName || 'element'}]`;
    }

    // Protect against common circular/complex objects by constructor name or properties
    const constructorName = val.constructor?.name;
    const isFiber = constructorName === 'FiberNode' || val.stateNode || val.memoizedProps || val.elementType;
    const isEvent = constructorName === 'SyntheticBaseEvent' || val.nativeEvent || val.target;
    const isElement = constructorName && (constructorName.includes('Element') || constructorName === 'HTMLInputElement');

    if (isFiber || isEvent || isElement || (constructorName && (constructorName.includes('React') || constructorName.includes('Fiber')))) {
      return `[Complex Protected Object: ${constructorName || (isFiber ? 'Fiber' : (isEvent ? 'Event' : 'Element'))}]`;
    }

    if (Array.isArray(val)) {
      return val.map(v => this.sanitize(v, cache));
    }

    const sanitized: any = {};
    // Use Object.keys to avoid inherited properties
    Object.keys(val).forEach(key => {
      const v = val[key];
      // Skip React internal properties early
      if (key.startsWith('__react') || key.startsWith('__fiber')) {
        sanitized[key] = '[React Internal]';
        return;
      }

      if (typeof v === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof v === 'symbol') {
        sanitized[key] = '[Symbol]';
      } else {
        sanitized[key] = this.sanitize(v, cache);
      }
    });

    return sanitized;
  }

  button(name: string, data?: any) {
    this.log("BUTTON", name, data);
  }

  firebase(action: string, data?: any) {
    this.log("FIREBASE", action, data);
  }

  stripe(stage: string, data?: any) {
    this.log("STRIPE", stage, data);
  }

  api(endpoint: string, error?: any) {
    this.log("API", endpoint, error);
  }

  flow(flowName: string, step: string) {
    this.log("FLOW", `${flowName} → ${step}`);
  }

  error(tag: string, error: any) {
    this.log("ERROR", tag, {
      message: error?.message || error,
      stack: error?.stack
    });
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

export const Mythos = new MythosDebug();

export function mythosStripe(stage: string, data?: any) {
  Mythos.stripe(stage, data);
}


export async function mythosAddDoc(collectionRef: any, data: any, addDocFn: any) {
  try {
    const sanitizedData = Mythos.sanitize(data);
    
    Mythos.firebase("WRITE_START", { 
      path: collectionRef?.path || 'unknown',
      data: sanitizedData 
    });

    const result = await addDocFn(collectionRef, sanitizedData);

    Mythos.firebase("WRITE_SUCCESS", result.id);

    return result;

  } catch (err) {
    Mythos.error("FIREBASE_WRITE_FAILED", err);
    throw err;
  }
}

export async function mythosUpdateDoc(docRef: any, data: any, updateDocFn: any) {
  try {
    const sanitizedData = Mythos.sanitize(data);
    
    Mythos.firebase("UPDATE_START", { 
      path: docRef?.path || 'unknown',
      data: sanitizedData 
    });

    await updateDocFn(docRef, sanitizedData);

    Mythos.firebase("UPDATE_SUCCESS", docRef?.id);

    return true;

  } catch (err) {
    Mythos.error("FIREBASE_UPDATE_FAILED", err);
    throw err;
  }
}
