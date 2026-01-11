import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"
import { HttpTypes } from "@medusajs/types"

type CountrySelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  region?: HttpTypes.StoreRegion
  placeholder?: string
}

const CountrySelect = forwardRef<HTMLSelectElement, CountrySelectProps>(
  ({ placeholder = "Select a country", region, defaultValue, className = "", ...props }, ref) => {
    const innerRef = useRef<HTMLSelectElement>(null)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    const countryOptions = useMemo(() => {
      if (!region) {
        return []
      }

      return region.countries?.map((country) => ({
        value: country.iso_2,
        label: country.display_name,
      }))
    }, [region])

    return (
      <div className="relative">
        <select
          ref={innerRef}
          defaultValue={defaultValue}
          className={`w-full bg-gray-1 rounded-md border border-gray-3 text-dark py-3 pl-5 pr-10 duration-200 appearance-none outline-none focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20 ${className}`}
          {...props}
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {countryOptions?.map(({ value, label }, index) => (
            <option key={index} value={value} className="text-dark bg-white">
              {label}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-4 pointer-events-none">
          <svg
            className="fill-current"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.41469 5.03569L2.41467 5.03571L2.41749 5.03846L7.76749 10.2635L8.0015 10.492L8.23442 10.2623L13.5844 4.98735L13.5844 4.98735L13.5861 4.98569C13.6809 4.89086 13.8199 4.89087 13.9147 4.98569C14.0092 5.08024 14.0095 5.21864 13.9155 5.31345C13.9152 5.31373 13.915 5.31401 13.9147 5.31429L8.16676 10.9622L8.16676 10.9622L8.16469 10.9643C8.06838 11.0606 8.02352 11.0667 8.00039 11.0667C7.94147 11.0667 7.89042 11.0522 7.82064 10.9991L2.08526 5.36345C1.99127 5.26865 1.99154 5.13024 2.08609 5.03569C2.18092 4.94086 2.31986 4.94086 2.41469 5.03569Z"
              fill=""
              stroke=""
              strokeWidth="0.666667"
            />
          </svg>
        </span>
      </div>
    )
  }
)

CountrySelect.displayName = "CountrySelect"

export default CountrySelect