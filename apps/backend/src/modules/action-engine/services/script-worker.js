const { parentPort, workerData } = require("worker_threads")
const vm = require("vm")

// ================= Allowed Globals =================
const ALLOWED_GLOBALS = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Buffer,
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
}

// ================= Safe Process Proxy =================
const safeProcess = new Proxy(
  {},
  {
    get(target, prop) {
      const blocked = [
        "exit",
        "kill",
        "abort",
        "dlopen",
        "binding",
        "abortOnUncaughtException",
      ]

      if (blocked.includes(prop)) {
        throw new Error(`process.${prop}() is disabled in sandbox`)
      }

      const safe = {
        env: { NODE_ENV: process.env.NODE_ENV || "development" },
        cwd: () => process.cwd(),
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        versions: process.versions,
        nextTick: (fn) => Promise.resolve().then(fn),
      }

      return safe[prop]
    },
  }
)

// ================= Sub Action Messaging =================
const memo = new Map()
const callStack = workerData.callStack || []

async function requestSubAction(type, identifier, params = {}) {
  const key = JSON.stringify({ type, identifier, params })

  if (memo.has(key)) {
    return memo.get(key)
  }

  return new Promise((resolve) => {
    parentPort.once("message", (msg) => {
      if (msg.type === "callActionResult") {
        memo.set(key, msg.payload)
        resolve(msg.payload)
      }
    })

    parentPort.postMessage({
      type,
      payload: { identifier, params, callStack },
    })
  })
}

// ================= Create Sandbox =================
function createSandbox() {
  const sandbox = Object.create(null)

  // inject allowed globals
  Object.assign(sandbox, ALLOWED_GLOBALS)

  // safer console
  sandbox.console = new Proxy(console, {
    get(target, prop) {
      if (typeof target[prop] === "function") {
        return (...args) => target[prop]("[Sandbox]", ...args)
      }
      return target[prop]
    },
  })

  // medusa actions
  sandbox.callAction = (name, params) =>
    requestSubAction("callAction", name, params)

  sandbox.callActionById = (id, params) =>
    requestSubAction("callActionById", id, params)

  sandbox.process = safeProcess

  // explicitly block dangerous globals
  sandbox.require = undefined
  sandbox.module = undefined
  sandbox.exports = undefined
  sandbox.global = undefined

  return sandbox
}

// ================= Execution =================
async function execute() {
  const { code, params } = workerData

  const sandbox = createSandbox()

  const context = vm.createContext(sandbox, {
    name: "medusa-script-sandbox",
  })

  try {
    // compile function safely
    const userFn = vm.compileFunction(
      `"use strict"; ${code}`,
      ["props"],
      {
        parsingContext: context,
      }
    )

    const result = await userFn(Object.freeze(params))

    parentPort.postMessage({ result })
  } catch (err) {
    parentPort.postMessage({
      error: err?.stack || err?.message || String(err),
    })
  }
}

execute()