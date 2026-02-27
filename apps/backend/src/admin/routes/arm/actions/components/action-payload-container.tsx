// action-payload-container.tsx
import { CodeBlock } from "@medusajs/ui"

export const ActionPayloadContainer = ({ payload }: { payload: any }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <CodeBlock
        snippets={[
          {
            label: "JSON",
            language: "json",
            code: JSON.stringify(payload || {}, null, 2),
          },
        ]}
      >
        <CodeBlock.Header />
        <CodeBlock.Body />
      </CodeBlock>
    </div>
  )
}