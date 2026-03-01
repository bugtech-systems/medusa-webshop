import React, { useState } from "react"
import { Input, Button, Label, Select, Tooltip } from "@medusajs/ui"
import { MagnifyingGlass, Funnel } from "@medusajs/icons"
import { Filter } from "./types"

interface SearchFilterBarProps {
  filters: Filter[]
  onFilterChange: (key: string, value: string) => void
  onSearch: (value: string) => void
  searchValue: string
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  onFilterChange,
  onSearch,
  searchValue,
}) => {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-fg-subtle" />
            <Input
              placeholder="Search reports..."
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Tooltip content="Toggle filters">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-ui-bg-base-hover' : ''}
          >
            <Funnel className="w-4 h-4" />
          </Button>
        </Tooltip>
      </div>

      {showFilters && filters.length > 0 && (
        <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
          <div className="grid grid-cols-3 gap-4">
            {filters.map((filter) => {
              if (filter.type === "text") {
                return (
                  <div key={filter.key}>
                    <Label size="xsmall">{filter.label}</Label>
                    <Input
                      size="small"
                      placeholder={`Filter by ${filter.label.toLowerCase()}`}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )
              } else if (filter.type === "select") {
                return (
                  <div key={filter.key}>
                    <Label size="xsmall">{filter.label}</Label>
                    <Select
                      onValueChange={(val) => onFilterChange(filter.key, val === "all" ? "" : val)}
                    >
                      <Select.Trigger className="mt-1">
                        <Select.Value placeholder={`All ${filter.label}`} />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="all">All</Select.Item>
                        {filter.options?.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )}
    </div>
  )
}