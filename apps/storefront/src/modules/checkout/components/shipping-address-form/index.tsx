import { HttpTypes } from "@medusajs/types"
import { Container, Textarea } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import { B2BCart, B2BCustomer } from "types/global"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import StateSelect from "../state-select"

const ShippingAddressForm = ({
  customer,
  cart,
}: {
  customer: B2BCustomer | null
  cart: B2BCart | null
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({})

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  ) as any;

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string,
    notes?: any
  ) => {
    address &&
      setFormData((prev) => ({
        ...prev,
        "shipping_address.first_name": address.first_name || "",
        "shipping_address.last_name": address.last_name || "",
        "shipping_address.company": address.company || "",
        "shipping_address.address_1": address.address_1 || "",
        "shipping_address.address_2": address.address_2 || "",
        "shipping_address.city": address.city || "",
        "shipping_address.province": address.province || "",
        "shipping_address.postal_code": address.postal_code || "",
        "shipping_address.country_code": address.country_code || "",
        "shipping_address.phone": address.phone || "",
        "order_notes": notes || "",
      }))

    email &&
      setFormData((prev) => ({
        ...prev,
        email,
      }))
      
      console.log('selected', address, email)
  }

  useEffect(() => {
    if (cart?.shipping_address) {
      setFormAddress(cart.shipping_address, cart.email, cart?.metadata?.order_notes)
    }
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 p-5">
          <p className="text-small-regular mb-3">
            Hi {customer.first_name}, want to use a saved address?
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={(e) => setFormAddress(e, cart?.email)}
          />
        </Container>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Email */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email || ""}
          onChange={handleChange}
          required

        />
                    {/* Phone */}
        <Input
          label="Phone"
          name="shipping_address.phone"
          value={formData["shipping_address.phone"] || ""}
          onChange={handleChange}
          // colSpan={2}
          required
        />
      <div className="grid small:grid-cols-2 grid-cols-2 gap-4 col-span-2">
        {/* Name */}
        <Input
          label="First Name"
          name="shipping_address.first_name"
          value={formData["shipping_address.first_name"] || ""}
          onChange={handleChange}
          required
        />
        <Input
          label="Last Name"
          name="shipping_address.last_name"
          value={formData["shipping_address.last_name"] || ""}
          onChange={handleChange}
          required
        />
        </div>
        <div className="grid small:grid-cols-1 grid-cols-2 gap-4 col-span-2">

        {/* Company */}
        <Input
          label="Company Name (Optional)"
          name="shipping_address.company"
          value={formData["shipping_address.company"] || ""}
          onChange={handleChange}
        />
</div>
        {/* Country */}
        <CountrySelect
          name="shipping_address.country_code"
          region={cart?.region}
          value={formData["shipping_address.country_code"] || "au"}
          onChange={handleChange}
          required
          className="col-span-2"
        />
<StateSelect
  name="shipping_address.province"
  region={cart?.region}
  countryCode={formData["shipping_address.country_code"]}
  value={formData["shipping_address.province"]}
  onChange={handleChange}
  onInvalidValue={() =>
    setFormData((prev) => ({
      ...prev,
      "shipping_address.province": "",
    }))
  }
  required
/>

        {/* Suburb / State / Postcode */}


        {/* Address */}
        <Input
          label="Street Address"
          // placeholder="House number and street name"
          name="shipping_address.address_1"
          value={formData["shipping_address.address_1"] || ""}
          onChange={handleChange}
          required
          // colSpan={2}
        />

        <Input
          label="Apartment, suite, unit, etc. (optional)"
          name="shipping_address.address_2"
          value={formData["shipping_address.address_2"] || ""}
          onChange={handleChange}
          // colSpan={2}
        />



        <Input
          label="Suburb"
          name="shipping_address.city"
          value={formData["shipping_address.city"] || ""}
          onChange={handleChange}
          required
        />


        <Input
          label="Postcode"
          name="shipping_address.postal_code"
          value={formData["shipping_address.postal_code"] || ""}
          onChange={handleChange}
          required
        />
  
        <div className="grid  grid-cols-1 gap-4 col-span-2">
        {/* Order Notes */}
        <Input
          label="Order Notes (Optional)"
          name="order_notes"
          value={formData["order_notes"] || ""}
          onChange={handleChange}
          // colSpan={2}
          
        />
        </div>
      </div>
    </>
  )
}

export default ShippingAddressForm
