
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, usePrompt, toast } from "@medusajs/ui"
import { AdminOrder } from "@medusajs/framework/types"


type WidgetProps = {
  data: AdminOrder
}


const PaymentLinkButton = ({ data }: WidgetProps) => {
  const prompt = usePrompt()
  const order = data

  // Generate the payment link (adjust URL to your storefront)
  const paymentLink = `http://localhost:3000/payment/${order.id}`

  const handleCopyLink = async () => {
    const shouldCopy = await prompt({
      title: "Copy payment link?",
      description: "This link will allow the customer to pay for this order.",
      confirmText: "Copy",
      cancelText: "Cancel",
    })

    if (shouldCopy) {
      await navigator.clipboard.writeText(paymentLink)
      toast.success("Payment link copied to clipboard")
    }
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Button variant="secondary" onClick={handleCopyLink}>
        Copy Payment Link
      </Button>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default PaymentLinkButton