import { Container, Table, Text } from "@medusajs/ui"
import { useAdminCustomQuery } from "medusa-react"

type Props = {
  driverId: string
}

const DriverDeliveries = ({ driverId }: Props) => {
  const { data, isLoading } = useAdminCustomQuery(
    `/admin/drivers/${driverId}/deliveries`,
    ["driver-deliveries", driverId]
  )

  if (isLoading) {
    return (
      <Container>
        <Text>Loading deliveries...</Text>
      </Container>
    )
  }

  const deliveries = data?.deliveries ?? []

  return (
    <Container>
      <Text size="large" weight="plus" className="mb-4">
        Deliveries
      </Text>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Address</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {deliveries.map((delivery) => (
            <Table.Row key={delivery.id}>
              <Table.Cell>{delivery.id}</Table.Cell>
              <Table.Cell>{delivery.order_id}</Table.Cell>
              <Table.Cell>{delivery.status}</Table.Cell>
              <Table.Cell>
                {delivery.address?.address_1},{" "}
                {delivery.address?.city}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export default DriverDeliveries
