import React, { useState, useEffect, useRef } from "react"
import { useForm, FormProvider, useFieldArray, Controller, useFormContext } from "react-hook-form"
import {
  Container,
  Heading,
  Button,
  CodeBlock,
  Text,
  Textarea,
  Input,
  Label,
  Select,
  Badge,
  Switch,
  toast,
  Alert
} from "@medusajs/ui"

interface ActionFormData {
  name: string
  description: string
  status?: any
  timeout_seconds: number
  retry_count: number
  fail_fast: boolean
  memory_mb: number
  config: any
}
    

export const DatabaseOperationFields = ({ 
  editMode, 
  initialConfig 
}: { 
  editMode: boolean
  initialConfig?: any
}) => {
  const { control, register, watch, setValue } = useFormContext<ActionFormData>()
  const operation = watch("config.operation")

  // Set default values when component mounts or operation changes
  useEffect(() => {
    if (editMode && operation) {
      // Set operation-specific defaults
      if (operation === "read") {
        if (!watch("config.limit")) setValue("config.limit", 10)
        if (!watch("config.offset")) setValue("config.offset", 0)
        if (!watch("config.orderBy")) setValue("config.orderBy", [])
      }
    }
  }, [operation, editMode, setValue, watch])

  // Helper function to safely parse JSON input
  const parseJsonInput = (value: string) => {
    if (!value.trim()) return null
    try {
      return JSON.parse(value)
    } catch {
      return value // Return as string if invalid JSON
    }
  }

  // Helper function to format array/object for display
  const formatJsonForDisplay = (value: any): string => {
    if (!value) return ''
    if (typeof value === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    return JSON.stringify(value, null, 2)
  }

  // Helper to get field placeholder based on operation
  const getFieldsPlaceholder = (op: string) => {
    switch(op) {
      case "read":
        return `["id", "email", "created_at"]`
      case "create":
      case "update":
        return `["id", "email"] // Fields to return`
      default:
        return `["id", "email", "created_at"]`
    }
  }

  // Helper to get data placeholder based on operation
  const getDataPlaceholder = (op: string) => {
    switch(op) {
      case "create":
        return `{ "email": "{{input.email}}", "active": true, "role": "user" }`
      case "update":
        return `{ "email": "{{input.email}}", "updated_at": "now()" }`
      default:
        return `{ "email": "{{input.email}}", "active": true }`
    }
  }

  // Helper to get where placeholder based on operation
  const getWherePlaceholder = (op: string) => {
    switch(op) {
      case "read":
        return `{ "status": "active", "created_at": { "gte": "2024-01-01" } }`
      case "update":
        return `{ "id": "{{input.user_id}}" }`
      case "delete":
        return `{ "id": { "in": ["id1", "id2"] } }`
      default:
        return `{ "id": "{{input.user_id}}" }`
    }
  }

  // Helper to get orderBy placeholder
  const getOrderByPlaceholder = () => {
    return `[
  { "field": "created_at", "direction": "DESC" },
  { "field": "name", "direction": "ASC" }
]`
  }
  
  console.log(editMode, initialConfig, operation, 'ddbbb')

  return (
    <div className="space-y-4">
      {/* Table */}
      <div>
        <Label>Table *</Label>
        {editMode ? (
          <Input
            {...register("config.table", { required: "Table name is required" })}
            placeholder="users, products, orders"
            className="mt-1"
            defaultValue={initialConfig?.table || ""}
          />
        ) : (
          <Text className="font-mono bg-ui-bg-subtle p-2 rounded-md mt-1">
            {initialConfig?.table || '-'}
          </Text>
        )}
      </div>

      {/* Operation */}
      <div>
        <Label>Operation *</Label>
        {editMode ? (
          <Controller
            name="config.operation"
            control={control}
            defaultValue={initialConfig?.operation || "read"}
            rules={{ required: "Operation is required" }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <Select.Trigger className="mt-1">
                  <Select.Value placeholder="Select operation" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="read">Read (SELECT)</Select.Item>
                  <Select.Item value="create">Create (INSERT)</Select.Item>
                  <Select.Item value="update">Update (UPDATE)</Select.Item>
                  <Select.Item value="delete">Delete (DELETE)</Select.Item>
                </Select.Content>
              </Select>
            )}
          />
        ) : (
          <Badge color={
            initialConfig?.operation === "read" ? "green" :
            initialConfig?.operation === "create" ? "blue" :
            initialConfig?.operation === "update" ? "orange" :
            initialConfig?.operation === "delete" ? "red" : "grey"
          }>
            {initialConfig?.operation?.toUpperCase() || '-'}
          </Badge>
        )}
      </div>

      {/* Fields / Returning */}
      {(operation === "read" || operation === "create" || operation === "update") && (
        <div>
          <Label>Fields / Returning</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            {operation === "read" ? "Columns to select" : "Columns to return after operation"}
          </Text>
          {editMode ? (
            <Controller
              name="config.fields"
              control={control}
              defaultValue={initialConfig?.fields || ["*"]}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || ["*"])
                  }}
                  placeholder={getFieldsPlaceholder(operation)}
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.fields && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.fields),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Data (INSERT / UPDATE) */}
      {(operation === "create" || operation === "update") && (
        <div>
          <Label>Data *</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Data to {operation}
          </Text>
          {editMode ? (
            <Controller
              name="config.data"
              control={control}
              defaultValue={initialConfig?.data || {}}
              rules={{ required: "Data is required for create/update operations" }}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || {})
                  }}
                  placeholder={getDataPlaceholder(operation)}
                  rows={4}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.data && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.data),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Where Clause */}
      {(operation === "read" || operation === "update" || operation === "delete") && (
        <div>
          <Label>Where</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            {operation === "delete" ? "Required for delete operations" : "Filter conditions"}
          </Text>
          {editMode ? (
            <Controller
              name="config.where"
              control={control}
              defaultValue={initialConfig?.where || {}}
              rules={operation === "delete" ? { required: "Where clause is required for delete operations" } : {}}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || {})
                  }}
                  placeholder={getWherePlaceholder(operation)}
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.where && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.where),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Order By - Only for Read operations */}
      {operation === "read" && (
        <div>
          <Label>Order By</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Sort results (array of field/direction objects)
          </Text>
          {editMode ? (
            <Controller
              name="config.orderBy"
              control={control}
              defaultValue={initialConfig?.orderBy || []}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || [])
                  }}
                  placeholder={getOrderByPlaceholder()}
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.orderBy && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.orderBy),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Limit - Only for Read operations */}
      {operation === "read" && (
        <div>
          <Label>Limit</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Maximum number of records to return
          </Text>
          {editMode ? (
            <Input
              {...register("config.limit")}
              type="number"
              placeholder="10"
              className="mt-1"
              defaultValue={initialConfig?.limit || 10}
            />
          ) : (
            <Text className="font-mono bg-ui-bg-subtle p-2 rounded-md mt-1">
              {initialConfig?.limit || '-'}
            </Text>
          )}
        </div>
      )}

      {/* Offset - Only for Read operations */}
      {operation === "read" && (
        <div>
          <Label>Offset</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Number of records to skip (for pagination)
          </Text>
          {editMode ? (
            <Input
              {...register("config.offset")}
              type="number"
              placeholder="0"
              className="mt-1"
              defaultValue={initialConfig?.offset || 0}
            />
          ) : (
            <Text className="font-mono bg-ui-bg-subtle p-2 rounded-md mt-1">
              {initialConfig?.offset || '-'}
            </Text>
          )}
        </div>
      )}

      {/* Joins - Only for Read operations */}
      {operation === "read" && (
        <div>
          <Label>Joins</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Join configuration for related tables
          </Text>
          {editMode ? (
            <Controller
              name="config.joins"
              control={control}
              defaultValue={initialConfig?.joins || []}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || [])
                  }}
                  placeholder={`[
  {
    "type": "LEFT",
    "table": "action_template",
    "on": {
      "action_relation.action_id": "action_template.id"
    },
    "fields": ["id", "name", "description", "config"]
  }
]`}
                  rows={4}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.joins && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.joins),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Group By - Only for Read operations */}
      {operation === "read" && (
        <div>
          <Label>Group By</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Group results by fields (for aggregation)
          </Text>
          {editMode ? (
            <Controller
              name="config.groupBy"
              control={control}
              defaultValue={initialConfig?.groupBy || []}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || [])
                  }}
                  placeholder='["user_id", "status"]'
                  rows={2}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.groupBy && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.groupBy),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

      {/* Having - Only for Read operations with Group By */}
      {operation === "read" && (
        <div>
          <Label>Having</Label>
          <Text size="small" className="text-ui-fg-subtle mb-1">
            Filter conditions for grouped results
          </Text>
          {editMode ? (
            <Controller
              name="config.having"
              control={control}
              defaultValue={initialConfig?.having || {}}
              render={({ field }) => (
                <Textarea
                  value={formatJsonForDisplay(field.value)}
                  onChange={(e) => {
                    const parsed = parseJsonInput(e.target.value)
                    field.onChange(parsed || {})
                  }}
                  placeholder='{ "COUNT(*)": { "gt": 5 } }'
                  rows={2}
                  className="mt-1 font-mono text-sm"
                />
              )}
            />
          ) : (
            initialConfig?.having && (
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: formatJsonForDisplay(initialConfig.having),
                }]}
              >
                <CodeBlock.Body />
              </CodeBlock>
            )
          )}
        </div>
      )}

    </div>
  )
}