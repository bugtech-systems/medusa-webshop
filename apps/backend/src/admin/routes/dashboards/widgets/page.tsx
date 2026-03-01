// src/admin/routes/reports/page.tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { WidgetsList } from "../../../components/widgets/WidgetsList"


const WidgetsPage = () => {
  return <WidgetsList />
}

export const config = defineRouteConfig({
  label: "Widgets",
  rank: 1
})

export default WidgetsPage