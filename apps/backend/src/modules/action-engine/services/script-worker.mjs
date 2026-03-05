import { parentPort, workerData } from 'worker_threads';
import vm from 'vm';

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
    
    // Skip empty lines
    if (currentLine === '') {
      i++;
      continue;
    }
    
    // Check if this line contains a return statement
    if (currentLine.includes('return') && !currentLine.startsWith('//')) {
      result.push(currentLine);
      i++;
    }
    // Handle object shorthand returns like {widget, data}
    else if (currentLine.startsWith('{') && currentLine.includes('}') && !currentLine.includes('return')) {
      result.push(`return ${currentLine};`);
      i++;
    }
    // Regular line
    else {
      result.push(currentLine);
      i++;
    }
  }
  
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

const createSecureSandbox = () => {
  const sandbox = {};
  
  const allowedGlobals = {
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console: {
      log: (...args) => console.log('[Sandbox]', ...args),
      error: (...args) => console.error('[Sandbox]', ...args),
      warn: (...args) => console.warn('[Sandbox]', ...args),
      info: (...args) => console.info('[Sandbox]', ...args),
    },
    
    callAction: (name, params) => requestSubAction("callAction", name, params),
    callActionById: (id, params) => requestSubAction("callActionById", id, params),
    
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
    Error,
    TypeError,
    Promise,
    JSON,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    encodeURIComponent,
    decodeURI,
    decodeURIComponent,
  };
  
  Object.assign(sandbox, allowedGlobals);
  
  sandbox.process = new Proxy({}, {
    get(target, prop) {
      const blockedMethods = ['exit', 'kill', 'abort', 'abortOnUncaughtException', 'dlopen', 'binding'];
      
      if (blockedMethods.includes(prop)) {
        throw new Error(`process.${prop}() is disabled in sandbox`);
      }
      
      const safeProps = {
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
      
      return safeProps[prop];
    },
    
    set(target, prop, value) {
      throw new Error(`Cannot set property ${prop} on process object in sandbox`);
    }
  });
  
  return sandbox;
};

try {
  const sandbox = createSecureSandbox();
  const context = vm.createContext(sandbox);
  
  const processedCode = parseAndPolishJSStringAdvanced(workerData.code);
  console.log('Executing code:', processedCode);
  
  // Create a function that takes props as parameter
  const functionScript = new vm.Script(`
    (async (props) => {
      ${processedCode}
    })
  `);
  
  const userFunction = functionScript.runInContext(context);
  
  if (typeof userFunction !== 'function') {
    throw new Error('Code did not produce a function');
  }
  
  // Execute the function with params
  const result = await userFunction(params);
  
  parentPort.postMessage({ result });
  
} catch (err) {
  console.error('Sandbox error:', err);
  parentPort.postMessage({ error: "SandboxError: " + err.message });
}