// src/modules/action-engine/services/script-worker.ts
import { parentPort, workerData } from 'worker_threads';

// Type definitions
interface WorkerData {
  params?: Record<string, any>;
  callStack?: string[];
  code: string;
}

interface CallActionMessage {
  type: string;
  payload: {
    identifier: string;
    params: Record<string, any>;
    callStack: string[];
  };
}

interface CallActionResultMessage {
  type: 'callActionResult';
  payload: any;
}

interface WorkerMessage {
  type?: string;
  error?: string;
  result?: any;
  payload?: any;
}

type MemoKey = string;
type MemoStore = Record<MemoKey, any>;

// Store original globals before any modifications
const originalGlobal = { ...global };

// Freeze params to prevent accidental mutation
const params: Readonly<Record<string, any>> = Object.freeze(
  (workerData as WorkerData).params || {}
);
const callStack: string[] = (workerData as WorkerData).callStack || [];
const memo: MemoStore = {};

// -----------------------------
// Support nested callAction
// -----------------------------
async function requestSubAction(
  type: string,
  identifier: string,
  params: Record<string, any> = {}
): Promise<any> {
  const memoKey: MemoKey = JSON.stringify({ type, identifier, params });
  
  if (memo[memoKey]) {
    return memo[memoKey];
  }

  return new Promise((resolve) => {
    const messageHandler = (msg: CallActionResultMessage) => {
      if (msg.type === 'callActionResult') {
        memo[memoKey] = msg.payload;
        resolve(msg.payload);
      }
    };

    parentPort!.once('message', messageHandler);

    const message: CallActionMessage = {
      type,
      payload: { identifier, params, callStack },
    };
    parentPort!.postMessage(message);
  });
}

// -----------------------------
// Function to create sandboxed environment
// -----------------------------
function createSandboxedFunction(code: string): Function {
  // Disabled globals for user code
  const disabled = ['require', 'process', 'module', 'exports', '__filename', '__dirname', 'Buffer'];
  
  // Create a new function with sandboxed arguments
  const sandboxedFn = new Function(
    'params',
    'callAction',
    'callActionById',
    'console',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    ...disabled.map(d => d), // Pass undefined for disabled globals
    `
    // Disable access to forbidden globals
    ${disabled.map(d => `const ${d} = undefined;`).join('\n')}
    
    // User code
    return (async function() {
      ${code}
    })();
    `
  );

  return sandboxedFn;
}

// -----------------------------
// Main execution function
// -----------------------------
async function runWorker(): Promise<void> {
  try {
    // Create sandboxed function
    const userFn = createSandboxedFunction((workerData as WorkerData).code);

    // Execute user code with allowed globals
    const result = await userFn(
      params,
      (name: string, params: Record<string, any>) => requestSubAction('callAction', name, params),
      (id: string, params: Record<string, any>) => requestSubAction('callActionById', id, params),
      console, // Provide limited console access
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval
    );

    const successMessage: WorkerMessage = { result };
    parentPort!.postMessage(successMessage);
  } catch (err: any) {
    const errorMessage: WorkerMessage = { 
      error: `ExecutionError: ${err.message}` 
    };
    parentPort!.postMessage(errorMessage);
  }
}

// Start the worker
runWorker().catch((err) => {
  const errorMessage: WorkerMessage = { 
    error: `WorkerError: ${err.message}` 
  };
  parentPort!.postMessage(errorMessage);
});