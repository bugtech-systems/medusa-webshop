import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { HttpTypes } from "@medusajs/types"

/**
 * Fallback static states for regions without provinces
 * (used only if region.provinces is empty)
 */
const FALLBACK_STATES: Record<string, { value: string; label: string }[]> = {
  au: [
    { value: "NSW", label: "New South Wales" },
    { value: "VIC", label: "Victoria" },
    { value: "QLD", label: "Queensland" },
    { value: "WA", label: "Western Australia" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NT", label: "Northern Territory" },
  ],
  us: [
    { value: "CA", label: "California" },
    { value: "NY", label: "New York" },
    { value: "TX", label: "Texas" },
    { value: "FL", label: "Florida" },
    { value: "IL", label: "Illinois" },
  ],
}

type StateSelectProps = NativeSelectProps & {
  region?: HttpTypes.StoreRegion
  countryCode?: string
  /** current value from formData */
  value?: string
  /** callback to reset province when invalid */
  onInvalidValue?: () => void
}

const StateSelect = forwardRef<HTMLSelectElement, StateSelectProps>(
  (
    {
      placeholder = "State / Territory",
      region,
      countryCode,
      value,
      onInvalidValue,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null)

    useImperativeHandle(ref, () => innerRef.current)

    /**
     * Build state list
     * Priority:
     * 1. region.provinces (Medusa canonical)
     * 2. fallback static list
     */
    const stateOptions = useMemo(() => {
      if (!countryCode) return []

      if (region?.provinces?.length) {
        return region.provinces
          .filter((p) => p.country_code === countryCode)
          .map((p) => ({
            value: p.iso_2 || p.id,
            label: p.display_name,
          }))
      }

      return FALLBACK_STATES[countryCode] || []
    }, [region, countryCode])

    /**
     * Auto-clear invalid province
     * Runs when country changes OR state list updates
     */
    useEffect(() => {
      if (!value) return
      const isValid = stateOptions.some((s) => s.value === value)
      if (!isValid) {
        onInvalidValue?.()
      }
    }, [countryCode, stateOptions, value, onInvalidValue])

    return (
      <NativeSelect
        ref={innerRef}
        placeholder={
          !countryCode ? "Select country first" : placeholder
        }
        disabled={!countryCode || !stateOptions.length}
        {...props}
      >
        {stateOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

StateSelect.displayName = "StateSelect"

export default StateSelect
