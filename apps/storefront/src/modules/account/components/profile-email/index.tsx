"use client"

import React, { useEffect, useState } from "react"
import { useFormState } from "react-dom"

import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
// import { updateCustomer } from "@lib/data/customer"

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

const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = useState(false)

  // NOTE: Email update currently disabled in Medusa
  const updateCustomerEmail = async (
    _prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    try {
      const payload = {
        email: formData.get("email") as string,
      }

      // await updateCustomer(payload)

      return { success: true, error: null }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message ?? "Failed to update email",
      }
    }
  }

  const [state, formAction] = useFormState(updateCustomerEmail, initialState)

  useEffect(() => {
    if (state.success) setSuccessState(true)
  }, [state.success])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Email"
        currentInfo={customer.email}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error ?? undefined}
        clearState={() => setSuccessState(false)}
        data-testid="account-email-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={customer.email}
            data-testid="email-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileEmail
