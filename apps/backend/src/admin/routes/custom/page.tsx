import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const CustomSettingPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Custom Setting Page</Heading>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Custom",
})

export default CustomSettingPage