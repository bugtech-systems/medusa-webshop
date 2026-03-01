"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Dashboard } from "../../components/dashboard/Dashboard"
import { DashboardTab } from "../../components/dashboard/types"

// Sample dashboard configuration with tab descriptions
const sampleTabs: DashboardTab[] = [
  {
    id: "tab-1",
    title: "MIMS",
    description: "Monitor pharmaceutical orders and vendor performance",
    widgets: [
      {
        id: "widget-1",
        type: "stat",
        title: "Total Orders",
        size: "medium",
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          value: "1,234",
          description: "Last 30 days",
          trend: 12.5,
          icon: "shopping-cart",
          color: "blue"
        }
      },
      {
        id: "widget-2",
        type: "stat",
        title: "Active Vendors",
        size: "medium",
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          value: "45",
          description: "Registered vendors",
          trend: 5.2,
          icon: "building"
        }
      },
      {
        id: "widget-3",
        type: "chart",
        title: "Order Trends",
        size: "medium",
        position: { x: 6, y: 0, w: 6, h: 4 },
        config: {
          type: "line",
          data: [
            { date: "Jan", orders: 120 },
            { date: "Feb", orders: 150 },
            { date: "Mar", orders: 180 },
            { date: "Apr", orders: 220 }
          ],
          options: { showLegend: true }
        }
      }
    ],
    layout: {
      columns: 12,
      rowHeight: 100,
      gap: 16
    }
  },
  {
    id: "tab-2",
    title: "APF",
    description: "Track Australian Pharmaceutical Formulary metrics",
    widgets: [
      {
        id: "widget-4",
        type: "list",
        title: "Pending Approvals",
        size: "medium",
        position: { x: 0, y: 0, w: 6, h: 3 },
        config: {
          items: [
            { label: "Order #1234", subLabel: "Pending review", value: "Urgent", badgeColor: "orange" },
            { label: "Vendor Application", subLabel: "ABC Pharma", value: "New", badgeColor: "blue" },
            { label: "Stock Alert", subLabel: "Low inventory", value: "Critical", badgeColor: "red" }
          ],
          showIcons: true
        }
      }
    ],
    layout: {
      columns: 12,
      rowHeight: 100,
      gap: 16
    }
  },
  {
    id: "tab-3",
    title: "Orders",
    description: "Manage and track all orders",
    widgets: [],
    layout: {
      columns: 12,
      rowHeight: 100,
      gap: 16
    }
  },
  {
    id: "tab-4",
    title: "Renewals",
    description: "Track subscription and contract renewals",
    widgets: [
      {
        id: "widget-5",
        type: "progress",
        title: "Monthly Targets",
        size: "medium",
        position: { x: 0, y: 0, w: 6, h: 3 },
        config: {
          items: [
            { 
              label: "Sales Target", 
              progress: 75,
              details: ["$75,000 of $100,000", "15 days remaining"]
            },
            { 
              label: "New Vendors", 
              progress: 60,
              details: ["12 of 20 vendors onboarded"]
            }
          ]
        }
      }
    ],
    layout: {
      columns: 12,
      rowHeight: 100,
      gap: 16
    }
  }
]

const DashboardPage = () => {


  return <Dashboard />
}





export const config = defineRouteConfig({
  label: "Dashboards",
  rank: 1
})

export default DashboardPage