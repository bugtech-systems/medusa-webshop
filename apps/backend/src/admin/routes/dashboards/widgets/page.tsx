import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DashboardContainer } from "../../../components/dashboard/DashboardContainer"

const CustomDashboardPage = () => {
  return <DashboardContainer />

}

export const config = defineRouteConfig({
  label: "Widgets",
  rank: 2
})

export default CustomDashboardPage