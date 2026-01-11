"use client"

import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  variant = "primary",
  className,
  "data-testid": dataTestId,
  disabled,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary"
  className?: string
  "data-testid"?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  const isLoading = pending || disabled

  const baseStyles = "w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
  
  const variantStyles = variant === "secondary" 
    ? "bg-gray-1 border border-gray-3 text-dark hover:bg-gray-2 hover:border-gray-4"
    : "bg-blue text-white hover:bg-blue-dark"

  const disabledStyles = "bg-gray-3 text-dark-4 cursor-not-allowed hover:bg-gray-3"

  return (
    <button
      className={`${baseStyles} ${isLoading ? disabledStyles : variantStyles} ${className || ""}`}
      type="submit"
      disabled={isLoading}
      data-testid={dataTestId}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}