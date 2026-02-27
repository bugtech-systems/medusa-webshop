import { Container, Text, Badge } from "@medusajs/ui"

type Props = {
  driver: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    status: "active" | "inactive"
  }
}

const DriverInfo = ({ driver }: Props) => {
  return (
    <Container>
      <div className="flex justify-between items-start">
        <div>
          <Text size="large" weight="plus">
            {driver.first_name} {driver.last_name}
          </Text>
          <Text className="text-ui-fg-subtle">{driver.email}</Text>
          {driver.phone && <Text>{driver.phone}</Text>}
        </div>

        <Badge
          color={driver.status === "active" ? "green" : "red"}
        >
          {driver.status}
        </Badge>
      </div>
    </Container>
  )
}

export default DriverInfo
