// Parse Zui schema to readable string format
export function parseZuiSchema(schema: any): string {
  if (!schema || typeof schema !== "object") {
    return "any";
  }

  const def = schema.def;

  if (!def || !def.type) {
    return "any";
  }

  switch (def.type) {
    case "string":
      return "string";

    case "number":
      return "number";

    case "boolean":
      return "boolean";

    case "object":
      if (!def.shape || typeof def.shape !== "object") {
        return "object";
      }

      const props = Object.entries(def.shape).map(
        ([key, value]: [string, any]) => {
          const type = parseZuiSchema(value);
          const isOptional = value?.def?.type === "optional";
          return `${key}${isOptional ? "?" : ""}: ${type}`;
        },
      );

      return `{ ${props.join(", ")} }`;

    case "array":
      const itemType = def.itemType ? parseZuiSchema(def.itemType) : "any";
      return `${itemType}[]`;

    case "optional":
      return parseZuiSchema(def.innerType);

    case "union":
      if (def.options && Array.isArray(def.options)) {
        const types = def.options.map((opt: any) => parseZuiSchema(opt));
        return types.join(" | ");
      }
      return "any";

    default:
      return def.type;
  }
}

// Find tool definition by name
export function findToolByName(tools: any[], toolName: string): any | null {
  return tools.find((tool) => tool.name === toolName) || null;
}
