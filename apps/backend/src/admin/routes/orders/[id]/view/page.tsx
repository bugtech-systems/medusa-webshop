import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"

// import Header from "./components/header"
// import Items from "./components/items"
// import Summary from "./components/summary"
// import Payments from "./components/payments"
// import Fulfillment from "./components/fulfillment"
// import Timeline from "./components/timeline"
// import Customer from "./components/customer"

const OrderViewPage = () => {
  const { id } = useParams()

    

  return (
    <div className="flex gap-6 p-6">
        HELLO WORLD!
      {/* <div className="flex-1 flex flex-col gap-6">
        <Header order={order} />
        <Items order={order} />
        <Timeline order={order} />
      </div>

      <div className="w-[360px] flex flex-col gap-6">
        <Summary order={order} />
        <Payments order={order} />
        <Fulfillment order={order} />
        <Customer order={order} />
      </div> */}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Order View",
})

export default OrderViewPage