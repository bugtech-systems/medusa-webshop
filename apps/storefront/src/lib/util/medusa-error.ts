export default function medusaError(error: any, type?: any): never {
console.log(error, 'ERRORRRRR', type)
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const u = new URL(error.config.url, error.config.baseURL)
    console.error("Resource:", u.toString())
    console.error("Response data:", error.response.data)
    console.error("Status code:", error.response.status)
    console.error("Headers:", error.response.headers)

    // Extracting the error message from the response data
    const message = error.response.data.message || error.response.data

    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error("No response received: " + error.request)
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error("Error setting up the request: " + error.message)
  }
}


export async function medusaErrors(res: Response) {
  const contentType = res.headers.get("content-type")

  let payload: any

  if (contentType?.includes("application/json")) {
    payload = await res.json()
  } else {
    const text = await res.text()
    payload = { message: text || res.statusText }
  }

  throw new Error(payload.message || "Medusa request failed")
}
