// script-worker.js
const { parentPort, workerData } = require("worker_threads");
const vm = require("vm");

const params = Object.freeze(workerData.params || {});
const callStack = workerData.callStack || [];
const memo = {};

async function requestSubAction(type, identifier, params = {}) {
  const memoKey = JSON.stringify({ type, identifier, params });
  if (memo[memoKey]) return memo[memoKey];

  return new Promise((resolve) => {
    parentPort.once("message", (msg) => {
      if (msg.type === "callActionResult") {
        memo[memoKey] = msg.payload;
        resolve(msg.payload);
      }
    });

    parentPort.postMessage({
      type,
      payload: { identifier, params, callStack }
    });
  });
}

// Create a sandboxed context using vm module instead of modifying global
const sandbox = {
  // Allow these Node.js built-ins
  Buffer: Buffer,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console,
  
  // Our custom functions
  callAction: (name, params) => requestSubAction("callAction", name, params),
  callActionById: (id, params) => requestSubAction("callActionById", id, params),
  
  // Create a safe process object
  process: new Proxy({}, {
    get(target, prop) {
      // Block dangerous methods
      const blockedMethods = ['exit', 'kill', 'abort', 'abortOnUncaughtException'];
      
      if (blockedMethods.includes(prop)) {
        throw new Error(`process.${prop}() is disabled in sandbox`);
      }
      
      // Provide safe versions of common process properties
      const safeProps = {
        env: { NODE_ENV: process.env.NODE_ENV || 'development' },
        cwd: () => process.cwd(),
        nextTick: (fn) => Promise.resolve().then(() => fn()),
        platform: process.platform,
        arch: process.arch,
        pid: null, // Don't expose real PID
        ppid: null,
        argv: [],
        argv0: null,
        version: process.version,
        versions: process.versions,
      };
      
      return safeProps[prop];
    }
  }),
  
  // Explicitly block these
  require: undefined,
  module: undefined,
  exports: undefined,
  __filename: undefined,
  __dirname: undefined,
  global: undefined,
};

// Add common globals that are safe
sandbox.Array = Array;
sandbox.Object = Object;
sandbox.String = String;
sandbox.Number = Number;
sandbox.Boolean = Boolean;
sandbox.Date = Date;
sandbox.RegExp = RegExp;
sandbox.Error = Error;
sandbox.TypeError = TypeError;
sandbox.Promise = Promise;
sandbox.JSON = JSON;
sandbox.Math = Math;
sandbox.parseInt = parseInt;
sandbox.parseFloat = parseFloat;
sandbox.isNaN = isNaN;
sandbox.isFinite = isFinite;
sandbox.encodeURI = encodeURI;
sandbox.encodeURIComponent = encodeURIComponent;
sandbox.decodeURI = decodeURI;
sandbox.decodeURIComponent = decodeURIComponent;

try {
  // Create a VM context with our sandbox
  const context = vm.createContext(sandbox);
  
  // Wrap the user code to ensure it's a function
  const script = new vm.Script(`
    (async function(props) {
      ${workerData.code}
    })
  `);
  
  // Run the script in the sandbox context
  const userFn = script.runInContext(context);
  
  if (typeof userFn !== "function") {
    parentPort.postMessage({ error: "TypeError: The script must be a function" });
    return;
  }
  
  // Execute the user function in the sandbox context
  (async () => {
    try {
      const result = await userFn(params);
      parentPort.postMessage({ result });
    } catch (err) {
      parentPort.postMessage({ error: "ExecutionError: " + err.message });
    }
  })();
} catch (err) {
  parentPort.postMessage({ error: "SandboxError: " + err.message });
}