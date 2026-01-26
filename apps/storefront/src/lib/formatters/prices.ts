// lib/util/prices.ts

/**
 * Currency configuration interface
 */
export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  decimalDigits: number
  rounding: number
}

/**
 * Supported currencies with their configurations
 */
export const CURRENCIES: Record<string, CurrencyConfig> = {
  AUD: {
    code: 'AUD',
    symbol: '$',
    name: 'Australian Dollar',
    decimalDigits: 2,
    rounding: 0,
  },
  AU: {
    code: 'AUD',
    symbol: '$',
    name: 'Australian Dollar',
    decimalDigits: 2,
    rounding: 0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalDigits: 2,
    rounding: 0,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalDigits: 2,
    rounding: 0,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalDigits: 2,
    rounding: 0,
  },
  CAD: {
    code: 'CAD',
    symbol: '$',
    name: 'Canadian Dollar',
    decimalDigits: 2,
    rounding: 0,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimalDigits: 0,
    rounding: 0,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimalDigits: 2,
    rounding: 0,
  },
}

/**
 * Default currency configuration
 */
export const DEFAULT_CURRENCY = CURRENCIES.AUD

/**
 * Format a price amount with currency
 * @param amount - Price amount in smallest unit (e.g., cents for AUD)
 * @param currencyCode - Currency code (default: 'AUD')
 * @param options - Additional formatting options
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  currencyCode: string = 'AUD',
  options: {
    showSymbol?: boolean
    showCode?: boolean
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    style?: 'currency' | 'decimal'
  } = {}
): string {
  const {
    showSymbol = true,
    showCode = false,
    locale = 'en-AU',
    minimumFractionDigits,
    maximumFractionDigits,
    style = 'currency',
  } = options

  const currency = CURRENCIES[currencyCode.toUpperCase()] || DEFAULT_CURRENCY

  // Convert amount from smallest unit to main unit (e.g., cents to dollars)
  const divisor = Math.pow(10, currency.decimalDigits)
  const mainUnitAmount = amount / divisor

  // Configure Intl.NumberFormat options
  const formatOptions: Intl.NumberFormatOptions = {
    style,
    currency: currency.code,
    currencyDisplay: showSymbol ? 'symbol' : 'code',
    minimumFractionDigits: minimumFractionDigits ?? currency.decimalDigits,
    maximumFractionDigits: maximumFractionDigits ?? currency.decimalDigits,
  }

  // Create formatter
  const formatter = new Intl.NumberFormat(locale, formatOptions)

  let formatted = formatter.format(amount)

// console.log(formatted, 'FORM1', divisor, mainUnitAmount, amount)

  // Add currency code if requested and not already included
  if (showCode && !formatted.includes(currency.code)) {
    formatted = `${formatted} ${currency.code}`
    // console.log(formatted, 'FORM2')
  }
// console.log(formatted, 'FORMA', currencyCode, currency)
  return formatted
}

/**
 * Format price range (min - max)
 * @param minAmount - Minimum price amount in smallest unit
 * @param maxAmount - Maximum price amount in smallest unit
 * @param currencyCode - Currency code (default: 'AUD')
 * @returns Formatted price range string
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currencyCode: string = 'AUD'
): string {
  if (minAmount === maxAmount) {
    return formatPrice(minAmount, currencyCode)
  }

  const minFormatted = formatPrice(minAmount, currencyCode, { showSymbol: true })
  const maxFormatted = formatPrice(maxAmount, currencyCode, { showSymbol: false })

  return `${minFormatted} - ${maxFormatted}`
}

/**
 * Format price with symbol only (no decimals if whole number)
 * @param amount - Price amount in smallest unit
 * @param currencyCode - Currency code (default: 'AUD')
 * @returns Formatted price with symbol
 */
export function formatPriceWithSymbol(
  amount: number,
  currencyCode: string = 'AUD'
): string {
  const currency = CURRENCIES[currencyCode.toUpperCase()] || DEFAULT_CURRENCY
  const divisor = Math.pow(10, currency.decimalDigits)
  const mainUnitAmount = amount / divisor

  // Check if amount is a whole number
  const isWholeNumber = mainUnitAmount % 1 === 0

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.code,
    currencyDisplay: 'symbol',
    minimumFractionDigits: isWholeNumber ? 0 : currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  })

  return formatter.format(mainUnitAmount)
}

/**
 * Format price for display in a compact form (e.g., $1.2K instead of $1,200)
 * @param amount - Price amount in smallest unit
 * @param currencyCode - Currency code (default: 'AUD')
 * @returns Compact formatted price
 */
export function formatCompactPrice(
  amount: number,
  currencyCode: string = 'AUD'
): string {
  const currency = CURRENCIES[currencyCode.toUpperCase()] || DEFAULT_CURRENCY
  const divisor = Math.pow(10, currency.decimalDigits)
  const mainUnitAmount = amount / divisor

  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.code,
    currencyDisplay: 'symbol',
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })

  return formatter.format(mainUnitAmount)
}

/**
 * Extract numeric amount from formatted price
 * @param formattedPrice - Formatted price string (e.g., "$12.50 AUD")
 * @returns Numeric amount in main unit
 */
export function parsePrice(formattedPrice: string): number {
  // Remove all non-numeric characters except decimal point
  const numericString = formattedPrice.replace(/[^0-9.-]+/g, '')
  return parseFloat(numericString) || 0
}

/**
 * Convert amount between currencies (simple conversion)
 * @param amount - Amount in smallest unit of source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param exchangeRate - Exchange rate (toCurrency/fromCurrency)
 * @returns Converted amount in smallest unit of target currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = 'AUD',
  toCurrency: string = 'AUD',
  exchangeRate: number = 1
): number {
  if (fromCurrency === toCurrency) return amount

  const fromConfig = CURRENCIES[fromCurrency.toUpperCase()] || DEFAULT_CURRENCY
  const toConfig = CURRENCIES[toCurrency.toUpperCase()] || DEFAULT_CURRENCY

  // Convert to main units, apply exchange rate, convert back to smallest unit
  const fromDivisor = Math.pow(10, fromConfig.decimalDigits)
  const toDivisor = Math.pow(10, toConfig.decimalDigits)

  const mainUnitAmount = amount / fromDivisor
  const convertedMainUnit = mainUnitAmount * exchangeRate
  const convertedAmount = Math.round(convertedMainUnit * toDivisor)

  return convertedAmount
}

/**
 * Calculate discount percentage
 * @param originalPrice - Original price in smallest unit
 * @param salePrice - Sale price in smallest unit
 * @returns Discount percentage (rounded)
 */
export function calculateDiscount(
  originalPrice: number,
  salePrice: number
): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) return 0
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100)
}

/**
 * Format discount for display
 * @param originalPrice - Original price in smallest unit
 * @param salePrice - Sale price in smallest unit
 * @param currencyCode - Currency code (default: 'AUD')
 * @returns Object with formatted discount info
 */
export function formatDiscountInfo(
  originalPrice: number,
  salePrice: number,
  currencyCode: string = 'AUD'
): {
  percentage: number
  amount: number
  formattedAmount: string
  formattedPercentage: string
} {
  const percentage = calculateDiscount(originalPrice, salePrice)
  const amount = originalPrice - salePrice

  return {
    percentage,
    amount,
    formattedAmount: formatPrice(amount, currencyCode),
    formattedPercentage: `${percentage}%`,
  }
}

/**
 * Format tax-inclusive price
 * @param amount - Base amount in smallest unit
 * @param taxRate - Tax rate as decimal (e.g., 0.10 for 10%)
 * @param currencyCode - Currency code (default: 'AUD')
 * @returns Formatted tax-inclusive price
 */
export function formatPriceWithTax(
  amount: number,
  taxRate: number = 0.10, // 10% GST for Australia
  currencyCode: string = 'AUD'
): {
  base: string
  tax: string
  total: string
  taxRate: string
} {
  const taxAmount = Math.round(amount * taxRate)
  const totalAmount = amount + taxAmount

  return {
    base: formatPrice(amount, currencyCode),
    tax: formatPrice(taxAmount, currencyCode),
    total: formatPrice(totalAmount, currencyCode),
    taxRate: `${(taxRate * 100).toFixed(1)}%`,
  }
}

/**
 * Validate currency code
 * @param currencyCode - Currency code to validate
 * @returns Whether the currency code is supported
 */
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode.toUpperCase() in CURRENCIES
}

/**
 * Get currency configuration
 * @param currencyCode - Currency code
 * @returns Currency configuration or default (AUD)
 */
export function getCurrencyConfig(currencyCode?: string): CurrencyConfig {
  if (!currencyCode) return DEFAULT_CURRENCY
  return CURRENCIES[currencyCode.toUpperCase()] || DEFAULT_CURRENCY
}