// Recursively remove x-zui, additionalProperties, and required from schema
function removeZuiMetadata(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeZuiMetadata);
  }

  if (obj && typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        key !== "x-zui" &&
        key !== "additionalProperties" &&
        key !== "required"
      ) {
        cleaned[key] = removeZuiMetadata(value);
      }
    }
    return cleaned;
  }

  return obj;
}

// Parse Zui schema to readable TypeScript type
export function parseZuiSchema(schema: any): string {
  if (!schema || typeof schema !== "object") {
    return "any";
  }

  try {
    const cleaned = removeZuiMetadata(schema);
    // Return just the properties object for brevity
    const output = cleaned.properties || cleaned;
    return JSON.stringify(output, null, 2);
  } catch (error) {
    console.warn("Failed to parse Zui schema:", error);
    return "any";
  }
}

// Find tool definition by name
export function findToolByName(tools: any[], toolName: string): any | null {
  return tools.find((tool) => tool.name === toolName) || null;
}
