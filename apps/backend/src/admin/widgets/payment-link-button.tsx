
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, usePrompt, toast } from "@medusajs/ui"
import { AdminOrder } from "@medusajs/framework/types"
import { useOrderLink } from "../hooks/api/order-preview"


type WidgetProps = {
  data: AdminOrder
}


const PaymentLinkButton = ({ data }: WidgetProps) => {
    const { data: order, isLoading,  refetch } = useOrderLink(data?.id!) as any;
  const prompt = usePrompt()

console.log(data, order, 'ORDERR')

  // Generate the payment link (adjust URL to your storefront)

  const handleCopyLink = async () => {

    let {data: orderData} = await refetch(data.id);
    console.log(orderData, 'ORDE')
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