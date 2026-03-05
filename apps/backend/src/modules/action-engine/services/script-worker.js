const { parentPort, workerData } = require("worker_threads")
const vm = require("vm")

// Allowed globals
const SAFE_GLOBALS = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Buffer,
  Promise,
  JSON,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  Boolean,
}

// Safe process proxy
const safeProcess = new Proxy({}, {
  get(_, prop) {
    const blocked = ["exit", "kill", "abort", "binding", "dlopen"]

    if (blocked.includes(prop)) {
      throw new Error(`process.${prop} is disabled`)
    }

    const safe = {
      env: { NODE_ENV: process.env.NODE_ENV },
      platform: process.platform,
      version: process.version,
      nextTick: (fn) => Promise.resolve().then(fn),
    }

    return safe[prop]
  }
})

// Create sandbox
function createSandbox() {
  const sandbox = Object.create(null)

  Object.assign(sandbox, SAFE_GLOBALS)

  sandbox.process = safeProcess

  sandbox.callAction = async () => {
    throw new Error("callAction not implemented in sandbox")
  }

  // Explicitly block dangerous globals
  sandbox.require = undefined
  sandbox.module = undefined
  sandbox.exports = undefined
  sandbox.global = undefined

  return sandbox
}

async function run() {
  try {
    const { code, params } = workerData

    const sandbox = createSandbox()

    const context = vm.createContext(sandbox)

    // IMPORTANT: shadow require before user code
    const wrappedCode = `
      "use strict";
      const require = undefined;
      const module = undefined;
      const exports = undefined;

      (async (props) => {
        ${code}
      })
    `

    const script = new vm.Script(wrappedCode)

    const fn = script.runInContext(context)

    const result = await fn(Object.freeze(params))

    parentPort?.postMessage({ result })

  } catch (err) {
    parentPort?.postMessage({
      error: err.stack || err.message
    })
  }
}

run()