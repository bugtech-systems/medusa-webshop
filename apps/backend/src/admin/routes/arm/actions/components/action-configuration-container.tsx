// action-configuration-container.tsx
import { CodeBlock, Text } from "@medusajs/ui"

export const ActionConfigurationContainer = ({ config }: { config: any }) => {
  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <Text className="text-ui-fg-subtle">
          No configuration data available
        </Text>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <CodeBlock
        snippets={[
          {
            label: "JSON",
            language: "json",
            code: JSON.stringify(config, null, 2),
          },
        ]}
      >
        <CodeBlock.Header />
        <CodeBlock.Body />
      </CodeBlock>
    </div>
  )
}