"use client"

import React, { useEffect, useState } from "react"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import useToggleState from "@lib/hooks/use-toggle-state"
import CountrySelect from "@modules/checkout/components/country-select"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import StateSelect from "@modules/checkout/components/state-select"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
  countryCode?: any
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
  countryCode
}) => {
  const { state, open, close } = useToggleState(false)

  const [removing, setRemoving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())
      await updateCustomerAddress(data, formData)
      close()
    } catch (err: any) {
      setError(err?.message || "Failed to update address")
    } finally {
      setIsSubmitting(false)
    }
  }


console.log(region, 'REG', address)
  return (
    <>
      {/* Address Card */}
      <div
        className={clx(
          "border rounded-rounded p-5 min-h-[220px] flex flex-col justify-between",
          { "border-gray-900": isActive }
        )}
      >
        <div>
          <Heading className="text-base-semi">
            {address.first_name} {address.last_name}
          </Heading>

          {address.company && (
            <Text className="text-ui-fg-base">{address.company}</Text>
          )}

          <Text className="mt-2">
            {address.address_1}
            {address.address_2 && `, ${address.address_2}`}
            <br />
            {address.postal_code}, {address.city}
            <br />
            {address.province && `${address.province}, `}
            {address.country_code?.toUpperCase()}
          </Text>
        </div>

        <div className="flex gap-x-4 mt-4">
          <button onClick={open} className="flex items-center gap-2">
            <Edit /> Edit
          </button>
          <button onClick={removeAddress} className="flex items-center gap-2">
            {removing ? <Spinner /> : <Trash />}
            Remove
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={state} close={close}>
        <Modal.Title>
          <Heading>Edit address</Heading>
        </Modal.Title>

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="addressId" value={address.id} />

  <input type="hidden" name="addressId" value={address.id} />

  <Modal.Body>
    <div className="grid gap-3">


      {/* NAME */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="First name"
          name="first_name"
          required
          defaultValue={address.first_name ?? ""}
        />
        <Input
          label="Last name"
          name="last_name"
          required
          defaultValue={address.last_name ?? ""}
        />
      </div>

      {/* COMPANY */}
      <Input
        label="Company"
        name="company"
        defaultValue={address.company ?? ""}
      />

      {/* ADDRESS */}
      <Input
        label="Address"
        name="address_1"
        required
        defaultValue={address.address_1 ?? ""}
      />

      <Input
        label="Apartment, suite, etc."
        name="address_2"
        defaultValue={address.address_2 ?? ""}
      />

      {/* POSTCODE + CITY */}
      <div className="grid grid-cols-[140px_1fr] gap-2">
        <Input
          label="Postal code"
          name="postal_code"
          required
          defaultValue={address.postal_code ?? ""}
        />
        <Input
          label="City"
          name="city"
          required
          defaultValue={address.city ?? ""}
        />
      </div>

      {/* COUNTRY */}
      <CountrySelect
        name="country_code"
        region={region}
        defaultValue={countryCode ?? ""}
        // onChange={(e) => setCountryCode(e.target.value)}
        required
      />

      {/* STATE / TERRITORY */}
      <StateSelect
        name="province"
        region={region}
        countryCode={countryCode}
        defaultValue={address.province ?? ""}
        required
        onInvalidValue={() => {
          const el = document.querySelector(
            'select[name="province"]'
          ) as HTMLSelectElement | null
          if (el) el.value = ""
        }}
      />

      {/* PHONE */}
      <Input
        label="Phone"
        name="phone"
        autoComplete="tel"
        defaultValue={address.phone ?? ""}
      />
    </div>

    {error && (
      <p className="text-rose-500 text-small-regular mt-2">
        {error}
      </p>
    )}
  </Modal.Body>

          <Modal.Footer>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={close}>
                Cancel
              </Button>
              <SubmitButton isLoading={isSubmitting}>Save</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditAddress
