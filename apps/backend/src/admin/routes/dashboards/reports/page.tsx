// src/admin/routes/reports/page.tsx
import { Paperclip } from "lucide-react"
import { ReportsList } from "../../../components/reports/ReportsList"
import { defineRouteConfig } from "@medusajs/admin-sdk"

let repConf = {
  "columns": [
    { "key": "label", "label": "Report Name", "sortable": true },
    { "key": "type", "label": "Type", "sortable": true },
    { "key": "created_at", "label": "Created", "sortable": true }
  ],
  "filters": [
    { "key": "name", "label": "Search by name", "type": "text" },
    { "key": "type", "label": "Filter by type", "type": "select", "options": ["Sales", "Inventory", "Customers"] }
  ],
  "formFields": [
    { "name": "label", "label": "Report Name", "type": "text", "required": true },
    { "name": "description", "label": "Description", "type": "textarea" },
    // { "name": "type", "label": "Type", "type": "select", "options": ["Sales", "Inventory", "Customers"], "required": true },
    { "name": "action", "label": "Action", "type": "select", "options": ["get-products", "get-customers", "get-orders"], "required": true },
  ]
}

const ReportsPage = () => {
  return <ReportsList config={repConf} />
}

export const config = defineRouteConfig({
  label: "Reports",
  icon: Paperclip,
  rank: 1
})

export default ReportsPage