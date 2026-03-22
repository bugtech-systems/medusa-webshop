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


interface FieldAttribute {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array' | 'date';
  required?: boolean;
  defaultValue?: any;
  nullable?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  refinedData: Record<string, any>;
}

export class StepActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StepActionError';
  }
}


/// Main validation and refinement function
export function validateAndRefineParameters(
  params: Record<string, any>,
  fieldAttributes: FieldAttribute[]
): ValidationResult {
  const errors: string[] = [];
  const refinedData: Record<string, any> = {};

  for (const field of fieldAttributes) {
    const value = params[field.name];

    // Handle missing values
    if (value === undefined || value === null) {
      if (field.required && field.defaultValue === undefined) {
        errors.push(`${field.name} is required`);
        continue;
      }
      
      // Use default value if available
      if (field.defaultValue !== undefined) {
        refinedData[field.name] = field.defaultValue;
      } else if (field.nullable) {
        refinedData[field.name] = null;
      } else {
        // Provide empty value based on type
        refinedData[field.name] = getEmptyValueForType(field.type);
      }
      continue;
    }

    // Check nullable constraint
    if (!field.nullable && value === null) {
      errors.push(`${field.name} cannot be null`);
      continue;
    }

    // Parse and validate type
    try {
      const parsedValue = parseValueToType(value, field.type);
      
      // Validate type parsing was successful
      if (parsedValue === undefined) {
        errors.push(`${field.name} must be of type ${field.type}`);
      } else {
        refinedData[field.name] = parsedValue;
      }
    } catch (error) {
      errors.push(`${field.name} failed type parsing: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    refinedData
  };
}

// Refine any object based on field attributes
export function refineObject(
  obj: Record<string, any>,
  fieldAttributes: FieldAttribute[]
): Record<string, any> {
  const refined: Record<string, any> = {};

  for (const field of fieldAttributes) {
    const value = obj[field.name];

    // Handle missing or undefined values
    if (value === undefined || value === null) {
      if (field.defaultValue !== undefined) {
        refined[field.name] = field.defaultValue;
      } else if (field.nullable) {
        refined[field.name] = null;
      } else {
        // Provide empty value based on type
        refined[field.name] = getEmptyValueForType(field.type);
      }
      continue;
    }

    // Handle non-nullable but null value
    if (!field.nullable && value === null) {
      refined[field.name] = field.defaultValue !== undefined 
        ? field.defaultValue 
        : getEmptyValueForType(field.type);
      continue;
    }

    // Parse value to correct type
    try {
      const parsedValue = parseValueToType(value, field.type);
      refined[field.name] = parsedValue !== undefined ? parsedValue : value;
    } catch {
      // If parsing fails, use original value but ensure it's the right type
      refined[field.name] = ensureType(value, field.type) || getEmptyValueForType(field.type);
    }
  }

  return refined;
}

// Parse value to specified type
export function parseValueToType(value: any, type: string): any {
  console.log(value, type, typeof value, 'PARSE VAL');
  
  if (value === null || value === undefined) {
    return value;
  }

  switch (type) {
    case 'string':
      return String(value);
      
    case 'number':
      const num = Number(value);
      return isNaN(num) ? undefined : num;
      
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value.toLowerCase() === '1';
      }
      if (typeof value === 'number') {
        return value === 1;
      }
      return Boolean(value);
      
    case 'json':
      // If it's already an object, return it
      if (typeof value === 'object' && value !== null) {
        return value;
      }
      
      // If it's a string, try to parse it
      if (typeof value === 'string') {
        console.log('STRING VALUE', value);
        
        // Trim the string
        const trimmed = value.trim();
        
        // Check if it's empty
        if (trimmed === '') {
          return {};
        }
        
        try {
          // First, try standard JSON parse
          return JSON.parse(trimmed);
        } catch (err) {
          console.log(err, 'ERROR PARSING JSON, attempting to fix common issues');
          
          // Try to fix common JSON issues
          try {
            // Replace single quotes with double quotes (but careful with escaped quotes)
            let fixed = trimmed.replace(/(\w+):/g, '"$1":'); // Add quotes to property names
            fixed = fixed.replace(/'/g, '"'); // Replace single quotes with double quotes
            
            // Try parsing again
            return JSON.parse(fixed);
          } catch (secondErr) {
            console.log(secondErr, 'SECOND ERROR PARSING');
            
            // If all parsing fails, return empty object
            return {};
          }
        }
      }
      
      // If it's neither object nor string, return empty object
      return {};
      
    case 'array':
      if (Array.isArray(value)) return value;
      
      if (typeof value === 'string') {
        try {
          const trimmed = value.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [value];
          }
          return [value];
        } catch {
          return [value];
        }
      }
      
      return value !== null ? [value] : [];
      
    case 'date':
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
      }
      if (typeof value === 'number') {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
      }
      return new Date().toISOString();
      
    default:
      return value;
  }
}

// Ensure value matches the expected type
export function ensureType(value: any, type: string): any {
  const parsed = parseValueToType(value, type);
  return parsed !== undefined ? parsed : getEmptyValueForType(type);
}

// Get empty value for a given type
export function getEmptyValueForType(type: string): any {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'json':
      return {};
    case 'array':
      return [];
    case 'date':
      return new Date().toISOString();
    default:
      return null;
  }
}

// Helper function to filter object by allowed fields
export function filterObjectByFields(
  obj: Record<string, any>,
  allowedFields: string[]
): Record<string, any> {
  const filtered: Record<string, any> = {};
  
  for (const field of allowedFields) {
    if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  }
  
  return filtered;
}

// Enhanced JSON parser that handles common JavaScript object syntax
export function parseJSONSafely(jsonString: string): any {
  if (!jsonString || typeof jsonString !== 'string') {
    return {};
  }
  
  const trimmed = jsonString.trim();
  
  // Try standard JSON parse first
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // If fails, try to convert JavaScript object syntax to JSON
    try {
      // Replace unquoted property names with quoted ones
      let fixed = trimmed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Replace single quotes with double quotes
      fixed = fixed.replace(/'/g, '"');
      
      // Remove trailing commas
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      return JSON.parse(fixed);
    } catch (innerError) {
      console.error('Failed to parse JSON:', innerError);
      return {};
    }
  }
}