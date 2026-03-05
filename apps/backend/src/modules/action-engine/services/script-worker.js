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

// Create sandbox for VM
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
module.exports = async function ({ code, params }) {
  const sandbox = createSandbox()
  const context = vm.createContext(sandbox)

  // Wrap user code in async function
  const wrappedCode = `
    "use strict";
    const require = undefined;
    (async (props) => {
      ${code}
    })
  `

  const script = new vm.Script(wrappedCode)
  const fn = script.runInContext(context)
const result = await Promise.race([
  fn(Object.freeze(params)),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Script timeout")), 5000)
  )
])
  // Run the user function with frozen props
  return result
}