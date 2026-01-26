"use client"

import React, { useEffect, useState } from "react"
import { useFormState } from "react-dom"

import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

type ActionState = {
  success: boolean
  error: string | null
}

const initialState: ActionState = {
  success: false,
  error: null,
}

const ProfilePhone: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = useState(false)

  const updateCustomerPhone = async (
    _prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    try {
      await updateCustomer({
        phone: formData.get("phone") as string,
      })

      return { success: true, error: null }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message ?? "Failed to update phone",
      }
    }
  }

  const [state, formAction] = useFormState(updateCustomerPhone, initialState)

  useEffect(() => {
    if (state.success) setSuccessState(true)
  }, [state.success])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Phone"
        currentInfo={customer.phone ?? ""}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error ?? undefined}
        clearState={() => setSuccessState(false)}
        data-testid="account-phone-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={customer.phone ?? ""}
            data-testid="phone-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePhone
