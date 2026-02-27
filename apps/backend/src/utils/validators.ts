export type FieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "json"
  | "array"

export interface ActionField {
  id: string
  name: string
  type: FieldType
  required?: boolean
}


const typeParsers: Record<
  FieldType,
  (value: any) => any
> = {
  string: (value) => {
    if (value === null || value === undefined) return value
    return String(value)
  },
  text: (value) => {
    if (value === null || value === undefined) return value
    return String(value)
  },

  number: (value) => {
    if (value === "" || value === null || value === undefined) return value
    const num = Number(value)
    if (Number.isNaN(num)) {
      return "Invalid number"
    }
    return num
  },

  boolean: (value) => {
    if (value === true || value === false) return value
    if (value === "true") return true
    if (value === "false") return false
    return Boolean(value)
  },

  json: (value) => {
    if (!value) return {}
    if (typeof value === "object") return value
    try {
      return JSON.parse(value)
    } catch {
      return "Invalid JSON";
    }
  },

  array: (value) => {
    if (Array.isArray(value)) return value
    if (typeof value === "string") {
      if(value.charAt(0) == "["){
        return JSON.parse(value);
      } else {
        return value.split(",").map((v) => v.trim())
      }
    }
    return "Invalid array";
  },
}


export interface ValidationError {
  field: string
  message: string
}

export const validateActionInput = (
  fields: ActionField[],
  values: Record<string, any>
): ValidationError[] => {
  const errors: ValidationError[] = []

  for (const field of fields) {
    const value = values[field.name]

    // Required check
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({
        field: field.name,
        message: "This field is required",
      })
      continue
    }

    // Type check (if value exists)
    if (value !== undefined && value !== null && value !== "") {
      try {
        typeParsers[field.type](value)
      } catch (e: any) {
        errors.push({
          field: field.name,
          message: e.message || "Invalid value",
        })
      }
    }
  }

  return errors
}




export const parseActionInput = (
  fields: ActionField[],
  rawValues: Record<string, any>
) => {
  const parsed: Record<string, any> = {}

  for (const field of fields) {
    const value = rawValues[field.name]

    if (value === undefined || value === null || value === "") {
      parsed[field.name] = value
      continue
    }

    const parser = typeParsers[field.type]

    if (!parser) {
      // throw new Error(`Unsupported field type: ${field.type}`);
      continue;
    }

    parsed[field.name] = parser(value)
  }

  return parsed
}
