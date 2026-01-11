import { StorePrice, HttpTypes } from "@medusajs/types"
import { QueryCompany, QueryEmployee } from "../types"


export type FeaturedProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
}

export type VariantPrice = {
  calculated_price_number: number
  calculated_price: string
  original_price_number: number
  original_price: string
  currency_code: string
  price_type: string
  percentage_diff: string
}

export type StoreFreeShippingPrice = StorePrice & {
  target_reached: boolean
  target_remaining: number
  remaining_percentage: number
}


export enum SpendingLimitResetFrequency {
  never = "never",
  daily = "daily",
  weekly = "weekly",
  monthly = "monthly",
  yearly = "yearly",
}

export interface B2BCart extends HttpTypes.StoreCart {
  company: QueryCompany
}

export interface B2BCustomer extends HttpTypes.StoreCustomer {
  employee: QueryEmployee | null
  orders?: HttpTypes.StoreOrder[]
}