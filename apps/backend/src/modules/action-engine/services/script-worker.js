const { parentPort, workerData } = require("worker_threads");
const vm = require("vm");

// ==================== Configuration ====================
// Allowed global objects from Node.js
const ALLOWED_GLOBALS = [
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Buffer', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date',
  'RegExp', 'Error', 'TypeError', 'Promise', 'JSON', 'Math',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent'
];

// ==================== Safe Process Proxy ====================
const safeProcess = new Proxy({}, {
  get(target, prop) {
    const blocked = ['exit', 'kill', 'abort', 'abortOnUncaughtException', 'dlopen', 'binding'];
    if (blocked.includes(prop)) {
      throw new Error(`process.${prop}() is disabled in sandbox`);
    }
    const safe = {
      env: { NODE_ENV: process.env.NODE_ENV || 'development' },
      cwd: () => process.cwd(),
      nextTick: (fn) => Promise.resolve().then(() => fn()),
      platform: process.platform,
      arch: process.arch,
      pid: null,
      ppid: null,
      argv: [],
      argv0: null,
      version: process.version,
      versions: process.versions,
    };
    return safe[prop];
  },
  set() { throw new Error("Cannot modify process object in sandbox"); }
});

// ==================== Request Sub-Action ====================
const memo = new Map();
const callStack = workerData.callStack || [];

async function requestSubAction(type, identifier, params = {}) {
  const key = JSON.stringify({ type, identifier, params });
  if (memo.has(key)) return memo.get(key);

  return new Promise((resolve) => {
    parentPort.once("message", (msg) => {
      if (msg.type === "callActionResult") {
        memo.set(key, msg.payload);
        resolve(msg.payload);
      }
    });

    parentPort.postMessage({
      type,
      payload: { identifier, params, callStack }
    });
  });
}

// ==================== Sandbox Creation ====================
function createSandbox() {
  const sandbox = {};

  // Add allowed globals
  for (const g of ALLOWED_GLOBALS) {
    if (g === 'console') {
      // Optional: prefix logs for better debugging
      sandbox.console = new Proxy(console, {
        get(target, prop) {
          if (typeof target[prop] === 'function') {
            return (...args) => target[prop]('[Sandbox]', ...args);
          }
          return target[prop];
        }
      });
    } else {
      sandbox[g] = global[g];
    }
  }

  // Custom Medusa action functions
  sandbox.callAction = (name, params) => requestSubAction("callAction", name, params);
  sandbox.callActionById = (id, params) => requestSubAction("callActionById", id, params);

  // Safe process object
  sandbox.process = safeProcess;

  return sandbox;
}

// ==================== Main Execution ====================
(async () => {
  try {
    const { code, params } = workerData;

    // Create isolated sandbox and context
    const sandbox = createSandbox();
    const context = vm.createContext(sandbox);

    // Wrap user code in an async function that receives `props`
    const scriptSource = `
      (async function(props) {
        ${code}
      })
    `;

    // Compile and run to get the function
    const script = new vm.Script(scriptSource);
    const userFn = script.runInContext(context);

    if (typeof userFn !== 'function') {
      throw new TypeError("The provided code did not evaluate to a function");
    }

    // Execute with frozen parameters to prevent mutation
    const result = await userFn(Object.freeze(params));

    parentPort.postMessage({ result });
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
})();