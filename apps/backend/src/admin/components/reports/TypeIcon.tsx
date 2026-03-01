import React from "react"
import {
  DocumentText,
  ChartBar,
  ListBullet,
  Clock,
  Star,
} from "@medusajs/icons"
import { Table as TableIcon  } from 'lucide-react';

interface TypeIconProps {
  type: string
  className?: string
}

export const TypeIcon: React.FC<TypeIconProps> = ({ type, className = "w-4 h-4" }) => {
  const icons: Record<string, any> = {
    query: DocumentText,
    visualization: ChartBar,
    table: TableIcon,
    list: ListBullet,
    schedule: Clock,
    kpi: Star,
  }
  
  const Icon = icons[type?.toLowerCase()] || DocumentText
  return <Icon className={className} />
}