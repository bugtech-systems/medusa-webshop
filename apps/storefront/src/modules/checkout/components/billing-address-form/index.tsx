import Input from "@modules/common/components/input"
import React, { useEffect, useState } from "react"
import { B2BCart } from "types/global"
import CountrySelect from "../country-select"
import StateSelect from "../state-select"

const BillingAddressForm = ({ cart }: { cart: B2BCart | null }) => {
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    setFormData({
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
  }, [cart?.billing_address])

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
    <>
      <div className="grid grid-cols-2 gap-4">

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
  countryCode={formData["shipping_address.country_code"] || "au"}
  value={formData["shipping_address.province"]}
  onChange={handleChange}
  // onInvalidValue={() =>
  //   setFormData((prev) => ({
  //     ...prev,
  //     "shipping_address.province": "",
  //   }))
  // }
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
      
      </div>
    </>
  )
}

export default BillingAddressForm
