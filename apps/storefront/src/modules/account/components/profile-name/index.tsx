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

const ProfileName: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = useState(false)

  const updateCustomerName = async (
    _prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    try {
      await updateCustomer({
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
      })

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Update failed" }
    }
  }

  const [state, formAction] = useFormState(updateCustomerName, initialState)

  useEffect(() => {
    if (state.success) setSuccessState(true)
  }, [state.success])

  return (
    <form action={formAction} className="w-full overflow-visible">
      <AccountInfo
        label="Name"
        currentInfo={`${customer.first_name} ${customer.last_name}`}
        isSuccess={successState}
        isError={!!state.error}
        clearState={() => setSuccessState(false)}
        data-testid="account-name-editor"
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Input
            label="First name"
            name="first_name"
            required
            defaultValue={customer.first_name ?? ""}
          />
          <Input
            label="Last name"
            name="last_name"
            required
            defaultValue={customer.last_name ?? ""}
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileName
