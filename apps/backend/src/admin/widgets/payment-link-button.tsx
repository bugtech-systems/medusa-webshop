import "../styles/global.css"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, usePrompt, toast } from "@medusajs/ui"
import { AdminOrder } from "@medusajs/framework/types"
import { useOrderLink } from "../hooks/api/order-preview"

type WidgetProps = {
  data: AdminOrder
}

const PaymentLinkButton = ({ data }: WidgetProps) => {
  const { isLoading, refetch } = useOrderLink(data?.id!) as any
  const prompt = usePrompt()

  // 🔹 If order is already paid, hide the button
  if (data.payment_status === "captured" || data.payment_status === "refunded" || data.payment_status === "authorized") {
    return null
  }

  // Generate the payment link (adjust URL to your storefront)
  const handleCopyLink = async () => {
    try {
      const { data: orderData } = await refetch(data.id)

      const shouldCopy = await prompt({
        title: "Copy payment link?",
        description: "This link will allow the customer to pay for this order.",
        confirmText: "Copy",
        cancelText: "Cancel",
      })

      if (shouldCopy) {
        await navigator.clipboard.writeText(orderData.payment_link)
        toast.success("Payment link copied to clipboard")
      }
    } catch (err) {
      toast.error("Failed to generate payment link")
    }
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Button variant="secondary" onClick={handleCopyLink} disabled={isLoading}>
        Copy Payment Link
      </Button>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after"
})

export default PaymentLinkButton