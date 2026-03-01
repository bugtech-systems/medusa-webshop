import React from "react"
import { Badge } from "@medusajs/ui"

interface StatusBadgeProps {
  status: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors: Record<string, "blue" | "green" | "red" | "orange" | "purple" | "grey"> = {
    active: "green",
    inactive: "grey",
    draft: "blue",
    archived: "orange",
    error: "red",
    published: "green",
    processing: "blue",
    completed: "green",
    failed: "red",
  }
  
  return (
    <Badge color={colors[status?.toLowerCase()] || "grey"} size="small">
      {status}
    </Badge>
  )
}