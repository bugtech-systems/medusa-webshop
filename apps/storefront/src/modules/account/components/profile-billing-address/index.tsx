"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useFormState } from "react-dom"

import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { addCustomerAddress, updateCustomerAddress } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
  regions: HttpTypes.StoreRegion[]
}

type ActionState = {
  success: boolean
  error: string | null
  isDefaultBilling: boolean
  isDefaultShipping: boolean
  addressId?: string
}

const ProfileBillingAddress: React.FC<MyInformationProps> = ({
  customer,
  regions,
}) => {
  const [successState, setSuccessState] = useState(false)

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  const initialState: ActionState = {
    success: false,
    error: null,
    isDefaultBilling: true,
    isDefaultShipping: false,
    addressId: billingAddress?.id,
  }

  const regionOptions = useMemo(() => {
    return (
      regions
        ?.flatMap((region) =>
          region.countries?.map((country) => ({
            value: country.iso_2,
            label: country.display_name,
          }))
        ) || []
    )
  }, [regions])

  const action = billingAddress
    ? updateCustomerAddress
    : addCustomerAddress

  const [state, formAction] = useFormState(action, initialState)

  useEffect(() => {
    if (state.success) setSuccessState(true)
  }, [state.success])

  const currentInfo = useMemo(() => {
    if (!billingAddress) return "No billing address"

    const country =
      regionOptions.find(
        (c) => c.value === billingAddress.country_code
      )?.label ?? billingAddress.country_code?.toUpperCase()

    return (
      <div className="flex flex-col font-semibold">
        <span>
          {billingAddress.first_name} {billingAddress.last_name}
        </span>
        <span>{billingAddress.company}</span>
        <span>
          {billingAddress.address_1}
          {billingAddress.address_2
            ? `, ${billingAddress.address_2}`
            : ""}
        </span>
        <span>
          {billingAddress.postal_code}, {billingAddress.city}
        </span>
        <span>{country}</span>
      </div>
    )
  }, [billingAddress, regionOptions])

  return (
    <form action={formAction} onReset={() => setSuccessState(false)}>
      <input type="hidden" name="addressId" value={billingAddress?.id} />

      <AccountInfo
        label="Billing address"
        currentInfo={currentInfo}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error ?? undefined}
        clearState={() => setSuccessState(false)}
        data-testid="account-billing-address-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <div className="grid grid-cols-2 gap-x-2">
            <Input name="first_name" label="First name" required defaultValue={billingAddress?.first_name} />
            <Input name="last_name" label="Last name" required defaultValue={billingAddress?.last_name} />
          </div>

          <Input name="company" label="Company" defaultValue={billingAddress?.company} />

          <Input
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={billingAddress?.phone ?? customer.phone ?? ""}
          />

          <Input name="address_1" label="Address" required defaultValue={billingAddress?.address_1} />
          <Input name="address_2" label="Apartment, suite, etc." defaultValue={billingAddress?.address_2} />

          <div className="grid grid-cols-[144px_1fr] gap-x-2">
            <Input name="postal_code" label="Postal code" required defaultValue={billingAddress?.postal_code} />
            <Input name="city" label="City" required defaultValue={billingAddress?.city} />
          </div>

          <Input name="province" label="Province" defaultValue={billingAddress?.province} />

          <NativeSelect name="country_code" required defaultValue={billingAddress?.country_code}>
            <option value="">-</option>
            {regionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileBillingAddress
