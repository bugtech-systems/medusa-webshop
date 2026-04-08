// --------------------------------------
// Expression Evaluator with Helpers and Array Mapping
// --------------------------------------

import { generateEntityId } from "@medusajs/framework/utils";
import { generateAlphaNumeric, sanitizePhoneNumber } from "../../utils/helpers";
import { toSql } from 'pgvector';

// Safe getter function - UPDATED to return null for missing values
function get(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    
    // Handle array bracket notation: items[0].name
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return defaultValue;
        
        // Check if the property exists on the object
        if (typeof current === 'object' && !Object.prototype.hasOwnProperty.call(current, part)) {
            return defaultValue;
        }
        
        current = current[part];
    }

    // Return defaultValue (null) if current is undefined, otherwise return current
    return current !== undefined ? current : defaultValue;
}

// Core expression evaluator (async)
async function evaluateExpression(expr, context, helpers = {}) {
    try {
        const scope = { ...context, ...helpers };

        // Wrap dot notation in get() - ensures null for missing values
        const processedExpr = expr.replace(
            /item\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
            (_, path) => `get(item, "${path}")`
        );

        const asyncEvaluator = new Function(
            ...Object.keys(scope),
            `"use strict"; return (async () => { return ${processedExpr}; })();`
        );

        return await asyncEvaluator(...Object.values(scope));
    } catch (err) {
        console.error(`Expression evaluation error: "${expr}"`, err.message);
        return null;
    }
}

// Default helper functions
const defaultFunctions = {
    // string helpers
    toUpper: str => str ? String(str).toUpperCase() : null,
    toLower: str => str ? String(str).toLowerCase() : null,
    capitalize: str => str ? String(str).charAt(0).toUpperCase() + String(str).slice(1) : null,
    string: str => str !== null && str !== undefined ? `"${String(str)}"` : null,
    number: str => str !== null && str !== undefined ? Number(str) : null,
    jsonStringify: str => str !== null && str !== undefined ? JSON.stringify(str, null, 2) : null,
    arrayParse: str => {
              if (typeof str !== 'string') return str;
              
              // Replace single quotes with double quotes and wrap in array brackets if needed
              try {
                // Check if it looks like an array string
                if (str.startsWith('[') && str.endsWith(']')) {
                  // Replace single quotes with double quotes
                  const jsonStr = str.replace(/'/g, '"');
                  return JSON.parse(jsonStr);
                }
              } catch (e) {
                console.error('Failed to parse string array:', e);
              }
              
              return str;
            },
    jsonParse: (value, pretty = false, indent = 2) => {
        if (value === null || value === undefined) return null;
        
        // If value is already an object/array (not a JSON string), return as-is
        if (typeof value !== 'string') {
            return pretty && value !== null && typeof value === 'object' 
                ? JSON.stringify(value, null, indent)
                : value;
        }
        
        const trimmed = value.trim();
        
        // Quick check for common JSON patterns
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                const parsed = JSON.parse(trimmed);
                // If pretty formatting requested, stringify with indentation
                return pretty ? JSON.stringify(parsed, null, indent) : parsed;
            } catch (error) {
                // If parsing fails, return original value
                console.warn('JSON parse error:', error.message);
                return value;
            }
        }
        
        // Doesn't look like JSON, return original
        return value;
    },
    arrayNumber: (embedding) => embedding.map(Number),
    hasValue: str => str !== null && str !== undefined && str !== "",
    isNull: str => (str !== null && str !== undefined && str !== "") ? str : null,
    replaceDefault: (newVal, old) => (newVal !== null && newVal !== undefined && newVal !== "" && newVal !== '') ? newVal : old,
    toSql: (data) => toSql(data),
    // date helpers
    dateFormat: date => date ? new Date(date).toLocaleDateString() : null,
    dateNow: () => new Date().toISOString().split("T")[0],

    // number helpers
    formatCurrency: num => num !== null && num !== undefined 
        ? Number(num).toLocaleString("en-US", { style: "currency", currency: "USD" })
        : null,
    formatPhoneNumber: num => num ? sanitizePhoneNumber(num) : null,

    // Generators
    generateTransactionId: () => generateAlphaNumeric(),

    // array/object helpers - Updated to handle null/undefined inputs
    filterBy: (arr, key, value) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.filter(item => item && item[key] === value);
    },
    sumBy: (arr, key) => {
        if (!arr || !Array.isArray(arr)) return 0;
        return arr.reduce((sum, item) => sum + (item && Number(item[key]) || 0), 0);
    },
    count: arr => (arr && Array.isArray(arr) ? arr.length : 0),
    mapBy: (arr, key) => {
        if (!arr || !Array.isArray(arr)) return [];
        return arr.map(item => item && item[key] !== undefined ? item[key] : null);
    },

    // ✅ Merge two objects deeply
    mergeObjects: (obj1 = {}, obj2 = {}) => {
        if (!obj1 || typeof obj1 !== "object") return obj2 || null;
        if (!obj2 || typeof obj2 !== "object") return obj1 || null;

        const result = { ...obj1 };
        for (const key of Object.keys(obj2)) {
            if (
                obj1[key] &&
                typeof obj1[key] === "object" &&
                !Array.isArray(obj1[key]) &&
                typeof obj2[key] === "object" &&
                !Array.isArray(obj2[key])
            ) {
                result[key] = defaultFunctions.mergeObjects(obj1[key], obj2[key]);
            } else {
                result[key] = obj2[key];
            }
        }
        return result;
    },

    // Array mapping function - placeholder friendly
    mapArray: async (array, fieldMappings, context = {}, helpers = {}) => {
        if (!Array.isArray(array)) return [];

        const allHelpers = { ...defaultFunctions, ...helpers };

        return Promise.all(
            array.map(async (item, index) => {
                const itemContext = { ...context, item, index, array, ...allHelpers };
                const mapped = {};

                for (const [fieldName, fieldExpression] of Object.entries(fieldMappings)) {
                    if (typeof fieldExpression === "string") {
                        mapped[fieldName] = await evaluateExpression(
                            fieldExpression,
                            itemContext,
                            allHelpers
                        );
                    } else if (typeof fieldExpression === "function") {
                        mapped[fieldName] = await fieldExpression(
                            item,
                            index,
                            array,
                            itemContext
                        );
                    } else if (
                        typeof fieldExpression === "object" &&
                        fieldExpression !== null
                    ) {
                        mapped[fieldName] = await defaultFunctions
                            .mapArray([item], fieldExpression, itemContext, allHelpers)
                            .then(r => r[0]);
                    } else {
                        mapped[fieldName] = fieldExpression;
                    }
                }

                return mapped;
            })
        );
    },
    
    mapObject: async (obj, fieldMappings, context = {}, helpers = {}) => {
        if (!obj || typeof obj !== "object") return {};

        const allHelpers = { ...defaultFunctions, ...helpers };
        const itemContext = { ...context, obj, ...allHelpers };
        let mapped = {};

        for (const [fieldName, fieldExpression] of Object.entries(fieldMappings)) {
            // Special case: spread fields from a nested object
            if (fieldName === "*") {
                let spreadSource = {} as any;

                if (typeof fieldExpression === "string") {
                    spreadSource = await evaluateExpression(
                        fieldExpression,
                        itemContext,
                        allHelpers
                    );
                } else if (typeof fieldExpression === "function") {
                    spreadSource = await fieldExpression(obj, itemContext);
                } else if (typeof fieldExpression === "object" && fieldExpression !== null) {
                    spreadSource = await defaultFunctions.mapObject(
                        obj,
                        fieldExpression,
                        itemContext,
                        allHelpers
                    );
                } else {
                    spreadSource = fieldExpression;
                }

                if (spreadSource && typeof spreadSource === "object") {
                    mapped = { ...mapped, ...spreadSource };
                }
            }
            // Normal mapping
            else if (typeof fieldExpression === "string") {
                mapped[fieldName] = await evaluateExpression(
                    fieldExpression,
                    itemContext,
                    allHelpers
                );
            } else if (typeof fieldExpression === "function") {
                mapped[fieldName] = await fieldExpression(obj, itemContext);
            } else if (typeof fieldExpression === "object" && fieldExpression !== null) {
                mapped[fieldName] = await defaultFunctions.mapObject(
                    obj,
                    fieldExpression,
                    itemContext,
                    allHelpers
                );
            } else {
                mapped[fieldName] = fieldExpression;
            }
        }

        return mapped;
    },

    // Nested field access helper
    get,

    arrayParamsObject: arr => {
        if (!Array.isArray(arr)) return { params: {}, defaults: {}, options: [] };
        
        const params = {};
        const defaults = {};
        const fieldOptions = arr.map(a => {
            params[a.field_name] = `<${a.data_type}>`;
            defaults[a.field_name] = `${a.default_value || ''}`;
            return { [a.field_name]: a.options };
        });

        return { params, defaults, options: fieldOptions };
    }
};

/**
 * Async placeholder resolver with all default functions
 */
export async function resolvePlaceholders(input, context = {}, helpers = {}) {
    const allFunctions = { ...defaultFunctions, ...helpers };
    const sandbox = { ...context, ...allFunctions, get }; // Ensure get is in scope

    const evalExpression = async expr => {
        try {
            const fn = new Function(
                ...Object.keys(sandbox),
                `"use strict"; return (async () => (${expr}))();`
            );
            return await fn(...Object.values(sandbox));
        } catch (e) {
            console.log('EXPRESSION ERROR', expr, e.message);
            return null;
        }
    };

    const resolve = async value => {
        if (typeof value === "string") {
            const regex = /\{\{(.*?)\}\}/g;
            let result = value;
            const matches = [...value.matchAll(regex)];

            for (const match of matches) {
                const expr = match[1].trim();
                const evaluated = await evalExpression(expr);
                result = result.replace(
                    match[0],
                    evaluated !== null && evaluated !== undefined
                        ? (typeof evaluated === "object" ? JSON.stringify(evaluated) : String(evaluated))
                        : ""
                );
            }

            // Try to parse as JSON, but return the string if parsing fails
            try {
                return result.trim() ? JSON.parse(result) : result;
            } catch {
                return result;
            }
        }

        if (Array.isArray(value)) {
            return Promise.all(value.map(v => resolve(v)));
        }

        if (value && typeof value === "object") {
            const entries = await Promise.all(
                Object.entries(value).map(async ([k, v]) => [k, await resolve(v)])
            );
            return Object.fromEntries(entries);
        }

        return value;
    };

    return resolve(input);
}

/**
 * Synchronous placeholder evaluation with all default functions
 */
export function evaluatePlaceholders(input, context = {}, extraFunctions = {}) {
    const allFunctions = { ...defaultFunctions, ...extraFunctions };
    const sandbox = { ...context, ...allFunctions, get }; // Ensure get is in scope

    const evalExpression = expr => {
        try {
            const fn = new Function(
                ...Object.keys(sandbox),
                `"use strict"; return (${expr});`
            );
            return fn(...Object.values(sandbox));
        } catch (e) {
            console.error(`Expression evaluation error: "${expr}"`, e.message);
            return null;
        }
    };

    const resolve = value => {
        if (typeof value === "string") {
            const replaced = value.replace(/\{\{(.*?)\}\}/g, (_, expr) => {
                const result = evalExpression(expr.trim());
                if (result === null || result === undefined) {
                    return "";
                }
                if (typeof result === "object") {
                    return JSON.stringify(result);
                }
                return String(result);
            });

            // Try to parse as JSON, but return the string if parsing fails
            try {
                return replaced.trim() ? JSON.parse(replaced) : replaced;
            } catch {
                return replaced;
            }
        }
        if (Array.isArray(value)) {
            return value.map(v => resolve(v));
        }
        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, resolve(v)])
            );
        }
        return value;
    };

    return resolve(input);
}

/**
 * Safely get nested property value from an object using dot/bracket notation.
 * Returns null if path is invalid or value is undefined.
 * @param {object} obj - The object to extract value from.
 * @param {string} path - Dot/bracket notation path, e.g. "user.profile.age" or "items[0].name".
 * @param {*} defaultValue - Value returned if path is invalid or undefined (defaults to null).
 */
function getNestedValue(obj, path, defaultValue = null) {
    if (!obj || typeof path !== "string") return defaultValue;

    return path
        .replace(/\[(\w+)\]/g, ".$1") // convert [0] → .0
        .split(".")
        .reduce((acc, key) => {
            if (acc && typeof acc === 'object' && Object.prototype.hasOwnProperty.call(acc, key)) {
                return acc[key];
            }
            return defaultValue;
        }, obj);
}

// Export individual functions
export { get, defaultFunctions, evaluateExpression, getNestedValue };