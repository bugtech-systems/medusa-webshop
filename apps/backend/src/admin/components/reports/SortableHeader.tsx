import React from "react"
import { Table } from "@medusajs/ui"
import { ArrowUpDown } from "@medusajs/icons"
import { Column } from "./types"

interface SortableHeaderProps {
  column: Column
  sortBy: string | null
  sortDir: "asc" | "desc"
  onSort: (key: string) => void
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  sortBy,
  sortDir,
  onSort,
}) => {
  return (
    <Table.HeaderCell>
      {column.sortable ? (
        <button
          className="flex items-center gap-1 hover:text-ui-fg-interactive transition-colors"
          onClick={() => onSort(column.key)}
        >
          {column.label}
          <ArrowUpDown className="w-3 h-3" />
          {sortBy === column.key && (
            <span className="text-ui-fg-interactive">
              {sortDir === "asc" ? "↑" : "↓"}
            </span>
          )}
        </button>
      ) : (
        column.label
      )}
    </Table.HeaderCell>
  )
}