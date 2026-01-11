"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"

/**
 * Retrieve store details
 */
export const retrieveStore = async () => {

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("store")),
    }
  

  return sdk.client
    .fetch<{ store: any }>(`/store/custom`, {
      method: "GET",
      next,
      headers,
      cache: "force-cache",
    })
    .then((data) => data)
    .catch(medusaError)
    
}

/**
 * Retrieve store currencies
 */
export const retrieveStoreCurrencies = async () => {
  const next = {
    ...(await getCacheOptions("store-currencies")),
  }

  return sdk.client
    .fetch<{ currencies: HttpTypes.StoreCurrency[] }>(`/store/currencies`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ currencies }) => currencies)
    .catch(medusaError)
}

/**
 * Retrieve store payment providers
 */
export const retrieveStorePaymentProviders = async () => {
  const next = {
    ...(await getCacheOptions("store-payment-providers")),
  }

  return sdk.client
    .fetch<{ payment_providers: HttpTypes.StorePaymentProvider[] }>(`/store/payment-providers`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ payment_providers }) => payment_providers)
    .catch(medusaError)
}

/**
 * Get cached store details with fallback
 */
const storeCache = new Map<string, any>()

export const getCachedStore = async () => {
  try {
    const cacheKey = "store-details"
    
    if (storeCache.has(cacheKey)) {
      return storeCache.get(cacheKey)!
    }

    const store = await retrieveStore()

    if (store) {
      storeCache.set(cacheKey, store)
    }

    return store
  } catch (e: any) {
    return null
  }
}

/**
 * Get store default currency
 */
export const getStoreDefaultCurrency = async () => {
  try {
    const store = await getCachedStore()
    
    if (!store) {
      return null
    }

    return store.default_currency_code
  } catch (e: any) {
    return null
  }
}

/**
 * Get store supported currencies
 */
export const getStoreCurrencies = async () => {
  try {
    const [store, currencies] = await Promise.all([
      getCachedStore(),
      retrieveStoreCurrencies()
    ])

    if (!store || !currencies) {
      return []
    }

    return currencies
  } catch (e: any) {
    return []
  }
}

/**
 * Check if currency is supported by store
 */
export const isCurrencySupported = async (currencyCode: string) => {
  try {
    const currencies = await getStoreCurrencies()
    
    return currencies.some(currency => currency.code === currencyCode)
  } catch (e: any) {
    return false
  }
}

/**
 * Get store metadata by key
 */
export const getStoreMetadata = async <T = any>(key: string): Promise<T | null> => {
  try {
    const store = await getCachedStore()
    
    if (!store?.metadata) {
      return null
    }

    return store.metadata[key] as T
  } catch (e: any) {
    return null
  }
}