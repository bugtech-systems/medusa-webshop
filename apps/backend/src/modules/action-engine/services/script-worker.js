const { parentPort, workerData } = require("worker_threads");
const vm = require("vm");

const params = Object.freeze(workerData.params || {});
const callStack = workerData.callStack || [];
const memo = {};

function parseAndPolishJSStringAdvanced(codeString) {
  // Remove carriage returns and split into lines
  const lines = codeString.replace(/\r/g, '').split('\n');
  
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const currentLine = lines[i].trim();
    
    // Skip empty lines unless they're part of the structure
    if (currentLine === '' && !lines[i + 1]?.includes('return')) {
      i++;
      continue;
    }
    
    // Check for incomplete declarations
    if (currentLine.match(/^(let|const|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*$/)) {
      const varName = currentLine.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/)[0];
      
      // Look ahead for the value
      let valueLine = '';
      let j = i + 1;
      
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.match(/^(let|const|var|return)/)) {
          valueLine = nextLine;
          break;
        }
        j++;
      }
      
      if (valueLine) {
        // Complete the declaration
        result.push(`${currentLine} ${valueLine};`);
        i = j + 1;
      } else {
        // Default to null if no value found
        result.push(`${currentLine} null;`);
        i++;
      }
    } 
    // Handle return statement
    else if (currentLine.includes('return') || 
             (currentLine.includes('{widget, data}') && !currentLine.includes('return'))) {
      if (currentLine.includes('{widget, data}') && !currentLine.includes('return')) {
        result.push(`return ${currentLine};`);
      } else {
        result.push(currentLine.endsWith(';') ? currentLine : currentLine + ';');
      }
      i++;
    }
    // Regular line
    else {
      result.push(currentLine);
      i++;
    }
  }
  
  // Join and ensure proper formatting
  return result.join('\n');
}

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

// Create a sandboxed context using vm module
// Important: We need to create a context without any pre-existing bindings
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
  
  // Create a safe process object - FIXED: Use a Proxy to intercept property access
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
    },
    
    // Prevent setting properties on process
    set(target, prop, value) {
      throw new Error(`Cannot set property ${prop} on process object in sandbox`);
    }
  }),
  
  // Add common globals that are safe
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  RegExp: RegExp,
  Error: Error,
  TypeError: TypeError,
  Promise: Promise,
  JSON: JSON,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  encodeURI: encodeURI,
  encodeURIComponent: encodeURIComponent,
  decodeURI: decodeURI,
  decodeURIComponent: decodeURIComponent,
};

// Create the VM context with our sandbox
const context = vm.createContext(sandbox);

try {
  console.log(parseAndPolishJSStringAdvanced(workerData.code), 'WORKER DATA');
  
  // Wrap the user code to ensure it's a function
  // IMPORTANT: Don't try to redeclare require or other globals in the code itself
  const script = new vm.Script(`
    (async function(props) {
      ${parseAndPolishJSStringAdvanced(workerData.code)}
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