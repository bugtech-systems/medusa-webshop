import { Listbox, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import { Fragment, useMemo } from "react"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput))
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="relative w-full flex justify-between items-center px-5 py-3 text-left bg-gray-1 cursor-default focus:outline-none border border-gray-3 rounded-md duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20 text-dark"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate text-dark-5">
                {selectedAddress
                  ? `${selectedAddress.address_1}, ${selectedAddress.city}`
                  : "Choose a saved address"}
              </span>
              <ChevronUpDown
                className={`w-5 h-5 text-dark-4 transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-20 w-full mt-1 overflow-auto bg-white border border-gray-3 rounded-md shadow-lg max-h-60 focus:outline-none"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              const isSelected = selectedAddress?.id === address.id
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className={({ active }) =>
                    `cursor-pointer select-none relative px-5 py-3 border-b border-gray-2 last:border-b-0 ${
                      active ? "bg-gray-1" : ""
                    } ${isSelected ? "bg-blue/5" : ""}`
                  }
                  data-testid="shipping-address-option"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center h-5 w-5 mt-0.5 ${isSelected ? "text-blue" : "text-dark-4"}`}>
                      <div className={`h-4 w-4 rounded-full border-2 ${isSelected ? "border-blue bg-blue" : "border-gray-4"}`}>
                        {isSelected && (
                          <svg
                            className="w-full h-full text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-dark">
                          {address.first_name} {address.last_name}
                        </span>
                        {address.company && (
                          <span className="text-sm text-dark-4">
                            ({address.company})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-dark-5 space-y-0.5">
                        <p>
                          {address.address_1}
                          {address.address_2 && `, ${address.address_2}`}
                        </p>
                        <p>
                          {address.city}, {address.postal_code}
                          {address.province && `, ${address.province}`}
                        </p>
                        <p className="font-medium">
                          {address.country_code?.toUpperCase()}
                        </p>
                      </div>
                      {address.phone && (
                        <p className="text-sm text-dark-4 mt-2">
                          📞 {address.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </Listbox.Option>
              )
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect