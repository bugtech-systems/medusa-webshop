// src/admin/routes/mims-orders/page.tsx
import { 
  Container, 
  Heading, 
  Text,
  Badge,
  StatusBadge,
  Button,
  toast,
  Input,
  Select,
  FocusModal,
  Alert,
  Table
} from "@medusajs/ui"
import { 
  Plus,
  Envelope,
  BuildingStorefront,
  MapPin,
  Calendar,
  Hashtag,
  InformationCircle,
  Phone,
  AtSymbol,
  DocumentText,
  PaperClip
} from "@medusajs/icons"
import { Cuboid, Printer, DownloadCloud } from 'lucide-react';
import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import CustomTablePage, { Column } from "../../components/dashboard/CustomTable"
import { Dashboard } from "../../components/dashboard/Dashboard"

// ============================================
// MIMS Order Data Type based on sample
// ============================================
interface MIMSOrder {
  id: string
  order_id: string                // Order ID
  created_date: string             // Created Date
  invoice_number: string           // Invoice Number
  order_number: string             // Order Number
  product_name: string             // Product Name
  quantity: number                 // Quantity
  primary_contact: string          // Primary Contact
  billing_phone: string            // Billing Phone
  account_name: string             // Account Name
  shipping_address_line1: string   // Shipping Address Line 1
  shipping_address_line2: string   // Shipping Address Line 2
  shipping_city: string            // Shipping City
  shipping_state: string           // Shipping State/Province
  shipping_zip: string             // Shipping Zip/Postal Code
  product_email: string            // Product Email
  billing_email: string            // Billing Email
  mims_id: string                  // MIMS ID
  shipping_status: string          // Shipping Status
  product_code: string             // Product Code
}

// ============================================
// MIMS Sample Data from the provided example
// ============================================
const sampleMIMSOrders: MIMSOrder[] = [
  {
    id: "1",
    order_id: "801RF00000auVve",
    created_date: "2026-12-01",
    invoice_number: "PSA-000271794",
    order_number: "271893",
    product_name: "Don't Rush to Crush for eMIMSplus",
    quantity: 1,
    primary_contact: "Jigneshkumar Patel",
    billing_phone: "430013570",
    account_name: "Jigneshkumar Patel",
    shipping_address_line1: "10 Fourth Street",
    shipping_address_line2: "",
    shipping_city: "MORGAN",
    shipping_state: "SA",
    shipping_zip: "5320",
    product_email: "",
    billing_email: "ph.jigo@yahoo.com.au",
    mims_id: "",
    shipping_status: "Processing",
    product_code: "DRTCEMC"
  },
  {
    id: "2",
    order_id: "801RF00000auVve",
    created_date: "2026-12-01",
    invoice_number: "PSA-000271794",
    order_number: "271893",
    product_name: "eMIMSplus and IMgateway 1 user",
    quantity: 1,
    primary_contact: "Jigneshkumar Patel",
    billing_phone: "430013570",
    account_name: "Jigneshkumar Patel",
    shipping_address_line1: "10 Fourth Street",
    shipping_address_line2: "",
    shipping_city: "MORGAN",
    shipping_state: "SA",
    shipping_zip: "5320",
    product_email: "",
    billing_email: "ph.jigo@yahoo.com.au",
    mims_id: "",
    shipping_status: "Processing",
    product_code: "EMPIMG1"
  }
]

// Generate additional sample data to demonstrate functionality
const generateAdditionalOrders = (): MIMSOrder[] => {
  const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "On Hold"]
  const products = [
    { name: "MIMS Pharmaceutical Guide 2026", code: "MPG2026" },
    { name: "eMIMSplus Annual Subscription", code: "EMPSUB" },
    { name: "Drug Interaction Checker Pro", code: "DICPRO" },
    { name: "MIMS Clinical Evidence", code: "MCEVID" },
    { name: "IV Compatibility Guide", code: "IVCOMP" },
    { name: "Pregnancy & Lactation Guide", code: "PLGUIDE" }
  ]
  
  const contacts = [
    "Sarah Chen", "Michael Rodriguez", "Emma Thompson", "David Kim", 
    "Lisa Wang", "James Wilson", "Maria Garcia", "John Smith"
  ]
  
  const accounts = [
    "Royal Melbourne Hospital", "Sydney Children's Hospital", "Westmead Pharmacy",
    "Brisbane Private Hospital", "Perth Medical Centre", "Adelaide Wellness Pharmacy",
    "Gold Coast Hospital", "Canberra Medical Supplies"
  ]

  const cities = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Hobart", "Darwin"]
  const states = ["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT"]

  return Array.from({ length: 20 }, (_, i) => {
    const product = products[Math.floor(Math.random() * products.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))
    const cityIndex = Math.floor(Math.random() * cities.length)
    
    return {
      id: `extra_${i + 3}`,
      order_id: `MIMS-${String(Math.floor(Math.random() * 10000)).padStart(8, '0')}`,
      created_date: date.toISOString().split('T')[0],
      invoice_number: `INV-${String(Math.floor(Math.random() * 1000000)).padStart(7, '0')}`,
      order_number: String(Math.floor(Math.random() * 1000000)),
      product_name: product.name,
      quantity: Math.floor(Math.random() * 5) + 1,
      primary_contact: contacts[Math.floor(Math.random() * contacts.length)],
      billing_phone: `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      account_name: accounts[Math.floor(Math.random() * accounts.length)],
      shipping_address_line1: `${Math.floor(Math.random() * 100) + 1} Hospital Street`,
      shipping_address_line2: Math.random() > 0.7 ? `Level ${Math.floor(Math.random() * 5) + 1}` : "",
      shipping_city: cities[cityIndex],
      shipping_state: states[cityIndex],
      shipping_zip: String(Math.floor(Math.random() * 9000) + 1000),
      product_email: `orders@${accounts[Math.floor(Math.random() * accounts.length)].toLowerCase().replace(/\s+/g, '')}.com.au`,
      billing_email: `billing@${accounts[Math.floor(Math.random() * accounts.length)].toLowerCase().replace(/\s+/g, '')}.com.au`,
      mims_id: Math.random() > 0.3 ? `MIMS-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}` : "",
      shipping_status: status,
      product_code: product.code
    }
  })
}

const allOrders = [...sampleMIMSOrders, ...generateAdditionalOrders()]

// ============================================
// Column Configuration for MIMS Orders
// ============================================

const mimsOrderColumns: Column[] = [
  {
    id: 'order_id',
    header: 'Order ID',
    accessorKey: 'order_id',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <Hashtag className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small" className="font-mono">{value}</Text>
      </div>
    )
  },
  {
    id: 'created_date',
    header: 'Created Date',
    accessorKey: 'created_date',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'date',
    cell: (value: string) => {
      const date = new Date(value)
      return (
        <div className="flex items-center gap-2">
          <Calendar className="text-ui-fg-subtle w-4 h-4" />
          <div>
            <Text size="small">{date.toLocaleDateString('en-AU')}</Text>
          </div>
        </div>
      )
    }
  },
  {
    id: 'invoice_number',
    header: 'Invoice Number',
    accessorKey: 'invoice_number',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <Badge size="small" color="blue" className="font-mono">
        {value}
      </Badge>
    )
  },
  {
    id: 'order_number',
    header: 'Order Number',
    accessorKey: 'order_number',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <Text size="small" className="font-mono">{value}</Text>
    )
  },
  {
    id: 'product_name',
    header: 'Product Name',
    accessorKey: 'product_name',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string, row: MIMSOrder) => (
      <div>
        <Text size="small" weight="plus">{value}</Text>
        <Text size="xsmall" className="text-ui-fg-subtle">Code: {row.product_code}</Text>
      </div>
    )
  },
  {
    id: 'quantity',
    header: 'Quantity',
    accessorKey: 'quantity',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'select',
    filterOptions: [
      { label: '1 unit', value: 1 },
      { label: '2 units', value: 2 },
      { label: '3+ units', value: { operator: 'greaterThan', value: 2 } }
    ],
    cell: (value: number) => (
      <Badge size="small" color="grey">{value} {value === 1 ? 'unit' : 'units'}</Badge>
    )
  },
  {
    id: 'primary_contact',
    header: 'Primary Contact',
    accessorKey: 'primary_contact',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <InformationCircle className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small">{value}</Text>
      </div>
    )
  },
  {
    id: 'billing_phone',
    header: 'Billing Phone',
    accessorKey: 'billing_phone',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <Phone className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small" className="font-mono">{value}</Text>
      </div>
    )
  },
  {
    id: 'account_name',
    header: 'Account Name',
    accessorKey: 'account_name',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <BuildingStorefront className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small">{value}</Text>
      </div>
    )
  },
  {
    id: 'shipping_address_line1',
    header: 'Shipping Address Line 1',
    accessorKey: 'shipping_address_line1',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string, row: MIMSOrder) => (
      <div className="flex items-center gap-2">
        <MapPin className="text-ui-fg-subtle w-4 h-4" />
        <div>
          <Text size="small">{value}</Text>
          {row.shipping_address_line2 && (
            <Text size="xsmall" className="text-ui-fg-subtle">{row.shipping_address_line2}</Text>
          )}
        </div>
      </div>
    )
  },
  {
    id: 'shipping_address_line2',
    header: 'Shipping Address Line 2',
    accessorKey: 'shipping_address_line2',
    enableSorting: false,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <Text size="small" className="text-ui-fg-subtle">
        {value || '—'}
      </Text>
    )
  },
  {
    id: 'shipping_city',
    header: 'Shipping City',
    accessorKey: 'shipping_city',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Sydney', value: 'Sydney' },
      { label: 'Melbourne', value: 'Melbourne' },
      { label: 'Brisbane', value: 'Brisbane' },
      { label: 'Perth', value: 'Perth' },
      { label: 'Adelaide', value: 'Adelaide' },
      { label: 'Canberra', value: 'Canberra' },
      { label: 'MORGAN', value: 'MORGAN' }
    ],
    cell: (value: string) => <Text size="small">{value}</Text>
  },
  {
    id: 'shipping_state',
    header: 'Shipping State/Province',
    accessorKey: 'shipping_state',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'select',
    filterOptions: [
      { label: 'NSW', value: 'NSW' },
      { label: 'VIC', value: 'VIC' },
      { label: 'QLD', value: 'QLD' },
      { label: 'WA', value: 'WA' },
      { label: 'SA', value: 'SA' },
      { label: 'ACT', value: 'ACT' },
      { label: 'TAS', value: 'TAS' },
      { label: 'NT', value: 'NT' }
    ],
    cell: (value: string) => <Badge size="small">{value}</Badge>
  },
  {
    id: 'shipping_zip',
    header: 'Shipping Zip/Postal Code',
    accessorKey: 'shipping_zip',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => <Text size="small" className="font-mono">{value}</Text>
  },
  {
    id: 'product_email',
    header: 'Product Email',
    accessorKey: 'product_email',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <AtSymbol className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small" className="truncate max-w-[150px]">{value || '—'}</Text>
      </div>
    )
  },
  {
    id: 'billing_email',
    header: 'Billing Email',
    accessorKey: 'billing_email',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <div className="flex items-center gap-2">
        <Envelope className="text-ui-fg-subtle w-4 h-4" />
        <Text size="small" className="truncate max-w-[150px]">{value}</Text>
      </div>
    )
  },
  {
    id: 'mims_id',
    header: 'MIMS ID',
    accessorKey: 'mims_id',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <Badge size="small" color="purple" className="font-mono">
        {value || '—'}
      </Badge>
    )
  },
  {
    id: 'shipping_status',
    header: 'Shipping Status',
    accessorKey: 'shipping_status',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Pending', value: 'Pending' },
      { label: 'Processing', value: 'Processing' },
      { label: 'Shipped', value: 'Shipped' },
      { label: 'Delivered', value: 'Delivered' },
      { label: 'Cancelled', value: 'Cancelled' },
      { label: 'On Hold', value: 'On Hold' }
    ],
    cell: (value: string) => {
      const colorMap: Record<string, 'orange' | 'blue' | 'purple' | 'green' | 'red' | 'grey'> = {
        'Pending': 'orange',
        'Processing': 'blue',
        'Shipped': 'purple',
        'Delivered': 'green',
        'Cancelled': 'red',
        'On Hold': 'grey'
      }
      return <StatusBadge color={colorMap[value] || 'grey'}>{value}</StatusBadge>
    }
  },
  {
    id: 'product_code',
    header: 'Product Code',
    accessorKey: 'product_code',
    enableSorting: true,
    enableFiltering: true,
    filterType: 'text',
    cell: (value: string) => (
      <Badge size="small" color="green" className="font-mono">
        {value}
      </Badge>
    )
  }
]

// ============================================
// Stats Card Component (replacement for Card)
// ============================================
const StatsCard = ({ label, value, icon, color = "blue", badge }: any) => (
  <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div>
        <Text size="xsmall" className="text-ui-fg-subtle">{label}</Text>
        <Heading level="h2">{value}</Heading>
      </div>
      <div className={`text-ui-fg-subtle`}>
        {icon}
      </div>
    </div>
    {badge && (
      <div className="mt-2">
        <Badge size="small" color={color}>{badge}</Badge>
      </div>
    )}
  </div>
)

// ============================================
// Main Page Component
// ============================================

const MIMSVendorOrdersPage = () => {
  const [selectedOrder, setSelectedOrder] = useState<MIMSOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle bulk actions
  const handleBulkAction = (selectedIds: string[]) => {
    console.log('Bulk action on:', selectedIds)
    toast.success(`Selected ${selectedIds.length} orders for bulk action`)
  }

  // Handle row click
  const handleRowClick = (row: MIMSOrder) => {
    setSelectedOrder(row)
    setIsModalOpen(true)
  }

  // Handle export
  const handleExport = () => {
    toast.success('Export started successfully')
  }

  // Handle create new order
  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setIsModalOpen(true)
  }

  // Handle print orders
  const handlePrintOrders = (selectedIds: string[]) => {
    toast.success(`Printing ${selectedIds.length} orders`)
  }

  // Handle email orders
  const handleEmailOrders = (selectedIds: string[]) => {
    toast.success(`Email sent for ${selectedIds.length} orders`)
  }

  // Custom actions for the table header
  const customActions = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={handleExport}>
        <DownloadCloud className="mr-2" />
        Export All
      </Button>
      <Button variant="primary" onClick={handleCreateOrder}>
        <Plus className="mr-2" />
        New MIMS Order
      </Button>
    </div>
  )

  // Bulk action menu
  const bulkActions = (selectedIds: string[]) => (
    <div className="flex items-center gap-2">
      <Button size="small" variant="secondary" onClick={() => handlePrintOrders(selectedIds)}>
        <Printer className="mr-2" />
        Print
      </Button>
      <Button size="small" variant="secondary" onClick={() => handleEmailOrders(selectedIds)}>
        <Envelope className="mr-2" />
        Email
      </Button>
    </div>
  )

  // Calculate stats
  const totalOrders = allOrders.length
  const processingOrders = allOrders.filter(o => o.shipping_status === 'Processing').length
  const pendingOrders = allOrders.filter(o => o.shipping_status === 'Pending').length
  const totalQuantity = allOrders.reduce((acc, o) => acc + o.quantity, 0)

  return (
    <>
      {/* Header Section */}
      {/* <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">MIMS Vendor Orders</Heading>
            <Badge color="green" size="small">v2.0</Badge>
          </div>
          <Text className="text-ui-fg-subtle mt-1">
            Manage and track pharmaceutical orders from MIMS vendors
          </Text>
        </div>
      </div> */}



      {/* Status Tabs */}
      {/* <div className="px-4  border-ui-border-base">
        <div className="flex gap-4">
          {['All', 'Pending', 'Processing', 'Shipped', 'Delivered'].map((tab) => (
            <button
              key={tab}
              className="pb-2 px-1 text-sm font-medium border-b-2 border-transparent hover:border-ui-border-base focus:border-ui-fg-base"
            >
              {tab}
            </button>
          ))}
        </div>
      </div> */}
 <Dashboard />
      {/* Main Table */}
      {/* <CustomTablePage
        title="MIMS Orders"
        description="View and manage all pharmaceutical orders"
        columns={mimsOrderColumns}
        data={allOrders}
        onBulkAction={handleBulkAction}
        onRowClick={handleRowClick}
        customActions={customActions}
        bulkActions={bulkActions}
        enableExport={true}
        enableSearch={true}
        enableFilters={true}
        pageSize={15}
      /> */}

      {/* Order Details Modal */}
      <FocusModal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
            {selectedOrder ? (
              <div className="max-w-4xl w-full p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <Heading level="h1">MIMS Order Details</Heading>
                    <Text className="text-ui-fg-subtle">{selectedOrder.order_id}</Text>
                  </div>
                  <StatusBadge color={
                    selectedOrder.shipping_status === 'Delivered' ? 'green' :
                    selectedOrder.shipping_status === 'Shipped' ? 'purple' :
                    selectedOrder.shipping_status === 'Processing' ? 'blue' :
                    selectedOrder.shipping_status === 'Pending' ? 'orange' : 'grey'
                  }>
                    {selectedOrder.shipping_status}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Order Information - Using div with border instead of Card */}
                  <div className="col-span-2 border border-ui-border-base rounded-lg p-4">
                    <Heading level="h2" className="mb-4">Order Information</Heading>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Order ID</Text>
                        <Text weight="plus" className="font-mono">{selectedOrder.order_id}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Order Number</Text>
                        <Text weight="plus" className="font-mono">{selectedOrder.order_number}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Invoice Number</Text>
                        <Text weight="plus" className="font-mono">{selectedOrder.invoice_number}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Created Date</Text>
                        <Text weight="plus">
                          {new Date(selectedOrder.created_date).toLocaleDateString('en-AU')}
                        </Text>
                      </div>
                      {selectedOrder.mims_id && (
                        <div>
                          <Text size="small" className="text-ui-fg-subtle">MIMS ID</Text>
                          <Badge color="purple">{selectedOrder.mims_id}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Information */}
                  <div className="border border-ui-border-base rounded-lg p-4">
                    <Heading level="h2" className="mb-4">Product Information</Heading>
                    <div className="space-y-4">
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Product Name</Text>
                        <Text weight="plus">{selectedOrder.product_name}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Product Code</Text>
                        <Badge color="green">{selectedOrder.product_code}</Badge>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Quantity</Text>
                        <Heading level="h2">{selectedOrder.quantity}</Heading>
                      </div>
                      {selectedOrder.product_email && (
                        <div>
                          <Text size="small" className="text-ui-fg-subtle">Product Email</Text>
                          <div className="flex items-center gap-2">
                            <Envelope className="text-ui-fg-subtle w-4 h-4" />
                            <Text>{selectedOrder.product_email}</Text>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="border border-ui-border-base rounded-lg p-4">
                    <Heading level="h2" className="mb-4">Customer Information</Heading>
                    <div className="space-y-4">
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Account Name</Text>
                        <div className="flex items-center gap-2">
                          <BuildingStorefront className="text-ui-fg-subtle w-4 h-4" />
                          <Text weight="plus">{selectedOrder.account_name}</Text>
                        </div>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Primary Contact</Text>
                        <Text>{selectedOrder.primary_contact}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Billing Phone</Text>
                        <Text className="font-mono">{selectedOrder.billing_phone}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Billing Email</Text>
                        <div className="flex items-center gap-2">
                          <Envelope className="text-ui-fg-subtle w-4 h-4" />
                          <Text>{selectedOrder.billing_email}</Text>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="col-span-2 border border-ui-border-base rounded-lg p-4">
                    <Heading level="h2" className="mb-4">Shipping Address</Heading>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Text size="small" className="text-ui-fg-subtle">Address</Text>
                        <div className="flex items-center gap-2">
                          <MapPin className="text-ui-fg-subtle w-4 h-4" />
                          <div>
                            <Text>{selectedOrder.shipping_address_line1}</Text>
                            {selectedOrder.shipping_address_line2 && (
                              <Text className="text-ui-fg-subtle">{selectedOrder.shipping_address_line2}</Text>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">City</Text>
                        <Text>{selectedOrder.shipping_city}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">State</Text>
                        <Text>{selectedOrder.shipping_state}</Text>
                      </div>
                      <div>
                        <Text size="small" className="text-ui-fg-subtle">Postal Code</Text>
                        <Text className="font-mono">{selectedOrder.shipping_zip}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl w-full p-8">
                <Heading level="h1" className="mb-8">Create New MIMS Order</Heading>
                <form className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Order ID</label>
                      <Input placeholder="MIMS-00000001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Created Date</label>
                      <Input type="date" placeholder="Select date" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Invoice Number</label>
                      <Input placeholder="INV-0000000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Order Number</label>
                      <Input placeholder="000000" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Product Name</label>
                    <Input placeholder="Enter product name" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <Input type="number" placeholder="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Product Code</label>
                      <Input placeholder="PRODCODE" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Name</label>
                    <Input placeholder="Enter account name" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Primary Contact</label>
                      <Input placeholder="Full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Billing Phone</label>
                      <Input placeholder="0412345678" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Billing Email</label>
                      <Input type="email" placeholder="billing@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Product Email</label>
                      <Input type="email" placeholder="orders@example.com" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Shipping Address</label>
                    <Input placeholder="Address Line 1" className="mb-2" />
                    <Input placeholder="Address Line 2 (optional)" className="mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="City" />
                      <Select>
                        <Select.Trigger>
                          <Select.Value placeholder="State" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="NSW">NSW</Select.Item>
                          <Select.Item value="VIC">VIC</Select.Item>
                          <Select.Item value="QLD">QLD</Select.Item>
                          <Select.Item value="WA">WA</Select.Item>
                          <Select.Item value="SA">SA</Select.Item>
                          <Select.Item value="ACT">ACT</Select.Item>
                          <Select.Item value="TAS">TAS</Select.Item>
                          <Select.Item value="NT">NT</Select.Item>
                        </Select.Content>
                      </Select>
                      <Input placeholder="ZIP" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Shipping Status</label>
                    <Select>
                      <Select.Trigger>
                        <Select.Value placeholder="Select status" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="Pending">Pending</Select.Item>
                        <Select.Item value="Processing">Processing</Select.Item>
                        <Select.Item value="Shipped">Shipped</Select.Item>
                        <Select.Item value="Delivered">Delivered</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">MIMS ID</label>
                    <Input placeholder="MIMS-000000" />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={() => {
                      toast.success('MIMS order created successfully')
                      setIsModalOpen(false)
                    }}>
                      Create Order
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}

export const config = defineRouteConfig({
  label: "Customization",
  // nested: "/orders"
})

export default MIMSVendorOrdersPage