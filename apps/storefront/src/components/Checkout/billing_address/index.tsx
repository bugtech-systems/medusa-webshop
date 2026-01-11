import { HttpTypes } from "@medusajs/types"
import React, { useState } from "react"
import CountrySelect from "../country-select"

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const [formData, setFormData] = useState<any>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
        <div className="w-full">
          <label htmlFor="billing_address.first_name" className="block mb-2.5">
            First Name <span className="text-red">*</span>
          </label>
          <input
            type="text"
            name="billing_address.first_name"
            id="billing_address.first_name"
            autoComplete="given-name"
            value={formData["billing_address.first_name"]}
            onChange={handleChange}
            required
            data-testid="billing-first-name-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="w-full">
          <label htmlFor="billing_address.last_name" className="block mb-2.5">
            Last Name <span className="text-red">*</span>
          </label>
          <input
            type="text"
            name="billing_address.last_name"
            id="billing_address.last_name"
            autoComplete="family-name"
            value={formData["billing_address.last_name"]}
            onChange={handleChange}
            required
            data-testid="billing-last-name-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="billing_address.address_1" className="block mb-2.5">
          Street Address <span className="text-red">*</span>
        </label>
        <input
          type="text"
          name="billing_address.address_1"
          id="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
          placeholder="House number and street name"
          className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
        />
      </div>

      <div>
        <label htmlFor="billing_address.company" className="block mb-2.5">
          Company Name
        </label>
        <input
          type="text"
          name="billing_address.company"
          id="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
          className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
        <div className="w-full">
          <label htmlFor="billing_address.postal_code" className="block mb-2.5">
            Postal Code <span className="text-red">*</span>
          </label>
          <input
            type="text"
            name="billing_address.postal_code"
            id="billing_address.postal_code"
            autoComplete="postal-code"
            value={formData["billing_address.postal_code"]}
            onChange={handleChange}
            required
            data-testid="billing-postal-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="w-full">
          <label htmlFor="billing_address.city" className="block mb-2.5">
            City <span className="text-red">*</span>
          </label>
          <input
            type="text"
            name="billing_address.city"
            id="billing_address.city"
            autoComplete="address-level2"
            value={formData["billing_address.city"]}
            onChange={handleChange}
            data-testid="billing-city-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
        <div className="w-full">
          <label htmlFor="billing_address.country_code" className="block mb-2.5">
            Country/Region <span className="text-red">*</span>
          </label>
          <CountrySelect
            name="billing_address.country_code"
            id="billing_address.country_code"
            autoComplete="country"
            region={cart?.region}
            value={formData["billing_address.country_code"]}
            onChange={handleChange}
            required
            data-testid="billing-country-select"
            className="w-full bg-gray-1 rounded-md border border-gray-3 text-dark-4 py-3 pl-5 pr-9 duration-200 appearance-none outline-none focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="w-full">
          <label htmlFor="billing_address.province" className="block mb-2.5">
            State / Province
          </label>
          <input
            type="text"
            name="billing_address.province"
            id="billing_address.province"
            autoComplete="address-level1"
            value={formData["billing_address.province"]}
            onChange={handleChange}
            data-testid="billing-province-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="billing_address.phone" className="block mb-2.5">
          Phone <span className="text-red">*</span>
        </label>
        <input
          type="tel"
          name="billing_address.phone"
          id="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
          className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
        />
      </div>
    </div>
  )
}

export default BillingAddress