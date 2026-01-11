import { HttpTypes } from "@medusajs/types"
import React, { useEffect, useMemo, useState } from "react"
import { mapKeys } from "lodash"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart])

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
    <div className="space-y-6">
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <div className="bg-gray-1 rounded-lg p-5 border border-gray-3">
          <p className="text-dark mb-4">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
          <div className="w-full">
            <label htmlFor="shipping_address.first_name" className="block mb-2.5">
              First Name <span className="text-red">*</span>
            </label>
            <input
              type="text"
              name="shipping_address.first_name"
              id="shipping_address.first_name"
              autoComplete="given-name"
              value={formData["shipping_address.first_name"]}
              onChange={handleChange}
              required
              data-testid="shipping-first-name-input"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>

          <div className="w-full">
            <label htmlFor="shipping_address.last_name" className="block mb-2.5">
              Last Name <span className="text-red">*</span>
            </label>
            <input
              type="text"
              name="shipping_address.last_name"
              id="shipping_address.last_name"
              autoComplete="family-name"
              value={formData["shipping_address.last_name"]}
              onChange={handleChange}
              required
              data-testid="shipping-last-name-input"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="shipping_address.address_1" className="block mb-2.5">
            Street Address <span className="text-red">*</span>
          </label>
          <input
            type="text"
            name="shipping_address.address_1"
            id="shipping_address.address_1"
            autoComplete="address-line1"
            value={formData["shipping_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="shipping-address-input"
            placeholder="House number and street name"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div>
          <label htmlFor="shipping_address.company" className="block mb-2.5">
            Company Name
          </label>
          <input
            type="text"
            name="shipping_address.company"
            id="shipping_address.company"
            value={formData["shipping_address.company"]}
            onChange={handleChange}
            autoComplete="organization"
            data-testid="shipping-company-input"
            className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
          <div className="w-full">
            <label htmlFor="shipping_address.postal_code" className="block mb-2.5">
              Postal Code <span className="text-red">*</span>
            </label>
            <input
              type="text"
              name="shipping_address.postal_code"
              id="shipping_address.postal_code"
              autoComplete="postal-code"
              value={formData["shipping_address.postal_code"]}
              onChange={handleChange}
              required
              data-testid="shipping-postal-code-input"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>

          <div className="w-full">
            <label htmlFor="shipping_address.city" className="block mb-2.5">
              City <span className="text-red">*</span>
            </label>
            <input
              type="text"
              name="shipping_address.city"
              id="shipping_address.city"
              autoComplete="address-level2"
              value={formData["shipping_address.city"]}
              onChange={handleChange}
              required
              data-testid="shipping-city-input"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
          <div className="w-full">
            <label htmlFor="shipping_address.country_code" className="block mb-2.5">
              Country/Region <span className="text-red">*</span>
            </label>
            <CountrySelect
              name="shipping_address.country_code"
              id="shipping_address.country_code"
              autoComplete="country"
              region={cart?.region}
              value={formData["shipping_address.country_code"]}
              onChange={handleChange}
              required
              data-testid="shipping-country-select"
              className="w-full bg-gray-1 rounded-md border border-gray-3 text-dark-4 py-3 pl-5 pr-9 duration-200 appearance-none outline-none focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>

          <div className="w-full">
            <label htmlFor="shipping_address.province" className="block mb-2.5">
              State / Province
            </label>
            <input
              type="text"
              name="shipping_address.province"
              id="shipping_address.province"
              autoComplete="address-level1"
              value={formData["shipping_address.province"]}
              onChange={handleChange}
              data-testid="shipping-province-input"
              className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-3">
          <div className="flex flex-col lg:flex-row gap-5 sm:gap-8">
            <div className="w-full">
              <label htmlFor="email" className="block mb-2.5">
                Email Address <span className="text-red">*</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                title="Enter a valid email address."
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                data-testid="shipping-email-input"
                className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
              />
            </div>

            <div className="w-full">
              <label htmlFor="shipping_address.phone" className="block mb-2.5">
                Phone <span className="text-red">*</span>
              </label>
              <input
                type="tel"
                name="shipping_address.phone"
                id="shipping_address.phone"
                autoComplete="tel"
                value={formData["shipping_address.phone"]}
                onChange={handleChange}
                data-testid="shipping-phone-input"
                className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <label
            htmlFor="same_as_billing"
            className="text-dark flex cursor-pointer select-none items-center"
          >
            <div className="relative">
              <input
                type="checkbox"
                id="same_as_billing"
                name="same_as_billing"
                checked={checked}
                onChange={onChange}
                className="sr-only"
                data-testid="billing-address-checkbox"
              />
              <div className="mr-3 flex h-5 w-5 items-center justify-center rounded border border-gray-4">
                {checked && (
                  <span className="text-blue">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="2"
                        y="2.00006"
                        width="12"
                        height="12"
                        rx="3"
                        fill="currentColor"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.3103 5.25104C11.471 5.41178 11.5612 5.62978 11.5612 5.85707C11.5612 6.08436 11.471 6.30236 11.3103 6.4631L7.0243 10.7491C6.8635 10.9098 6.6455 11.0001 6.4182 11.0001C6.191 11.0001 5.973 10.9098 5.8122 10.7491L3.24062 8.1775C3.08448 8.0158 2.99808 7.7993 3.00003 7.57455C3.00199 7.3498 3.09214 7.13481 3.25107 6.97588C3.41 6.81695 3.62499 6.7268 3.84975 6.72484C4.0745 6.72289 4.29103 6.80929 4.4527 6.96543L6.4182 8.931L10.0982 5.25104C10.2589 5.09034 10.4769 5.00006 10.7042 5.00006C10.9315 5.00006 11.1495 5.09034 11.3103 5.25104Z"
                        fill="white"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </div>
            Billing address same as shipping address
          </label>
        </div>
      </div>
    </div>
  )
}

export default ShippingAddress