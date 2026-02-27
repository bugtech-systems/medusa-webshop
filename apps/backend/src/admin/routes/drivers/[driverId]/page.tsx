import { useAdminCustomQuery } from "medusa-react"
import { Container, Heading } from "@medusajs/ui"
import DriverInfo from "../components/DriverInfo"
import DriverDeliveries from "../components/DriverDeliveries"
import { useParams } from "react-router-dom"
import { Loader2 } from "lucide-react";




const DriverDetailsPage = () => {
  const { id } = useParams()

  const { data, isLoading } = useAdminCustomQuery(
    `/admin/drivers/${id}`,
    ["driver", id]
  )

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
          <Loader2 className="animate-spin" />
      </div>
    )
  }

  const driver = data?.driver

  return (
    <div className="flex flex-col gap-y-6">
      <Heading level="h1">Driver</Heading>

      <DriverInfo driver={driver} />
      <DriverDeliveries driverId={id!} />
    </div>
  )
}

export default DriverDetailsPage
