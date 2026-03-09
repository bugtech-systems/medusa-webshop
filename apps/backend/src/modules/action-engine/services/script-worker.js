const vm = require("vm")

// Allowed globals in sandbox
const SAFE_GLOBALS = {
  console,
  setTimeout,
  clearTimeout,
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

function createSandbox() {
  const sandbox = Object.create(null)
  Object.assign(sandbox, SAFE_GLOBALS)

  // Block dangerous globals
  sandbox.require = undefined
  sandbox.module = undefined
  sandbox.exports = undefined
  sandbox.global = undefined

  return sandbox
}

/**
 * Piscina expects a function exported
 * that receives the job payload
 */
module.exports = async function (task = {}) {
  const { code, params } = task

  if (typeof code !== "string") {
    throw new Error("[Worker] 'code' must be a string")
  }

  const safeParams = params ?? {}
console.log("[Worker] Received params:", JSON.stringify(safeParams))
console.time("[Worker] Execution time")
  const sandbox = createSandbox()
  const context = vm.createContext(sandbox)

  // Wrap user code in async function
  const wrappedCode = `
    "use strict";
    (async (props) => {
      ${code}
    })
  `

  const script = new vm.Script(wrappedCode)
  const fn = script.runInContext(context)

  // Execute with timeout
  const result = await Promise.race([
    fn(Object.freeze(safeParams)),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Script timeout")), 5000)
    ),
  ])

  return result
}