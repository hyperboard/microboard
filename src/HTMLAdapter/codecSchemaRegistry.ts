import { itemSchemas } from "Items/itemSchemas";
import { itemFactories } from "itemFactories";
import { z } from "zod";
import type { ComponentSchema, SchemaRegistry } from "web-component-json-codec";

type CodecSchemaType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "number[]"
  | "boolean[]"
  | "number[][]"
  | "json";

type CodecPropertyDefinition = {
  type: CodecSchemaType;
};

export const BOARD_DOCUMENT_TAG = "microboard-document";

const SCALAR_TYPES: Record<string, CodecSchemaType> = {
  string: "string",
  number: "number",
  boolean: "boolean",
};

export function buildBoardHtmlSchemaRegistry(): SchemaRegistry {
  const registry: SchemaRegistry = {
    [BOARD_DOCUMENT_TAG]: {
      type: BOARD_DOCUMENT_TAG,
      properties: {
        boardId: { type: "string" },
        format: { type: "string" },
        lastEventOrder: { type: "number" },
        name: { type: "string" },
        version: { type: "number" },
      },
    },
  };

  for (const [itemType, schema] of Object.entries(itemSchemas)) {
    registry[itemTypeToHtmlTag(itemType)] = zodObjectToComponentSchema(
      itemTypeToHtmlTag(itemType),
      schema as z.ZodObject<any>,
    );
  }

  return registry;
}

export function itemTypeToHtmlTag(itemType: string): string {
  const kebab = itemType
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return `microboard-${kebab}`;
}

export function htmlTagToItemType(tagName: string): string | undefined {
  return Object.keys(itemFactories).find((itemType) => itemTypeToHtmlTag(itemType) === tagName);
}

function zodObjectToComponentSchema(type: string, schema: z.ZodObject<any>): ComponentSchema {
  const properties: Record<string, CodecPropertyDefinition> = {
    id: { type: "string" },
  };

  for (const [property, propertySchema] of Object.entries(schema.shape)) {
    const scalarType = getScalarSchemaType(unwrapSchema(propertySchema));
    properties[property] = isHtmlSafeAttributeName(property) && scalarType
      ? { type: scalarType }
      : { type: "json" };
  }

  return {
    type,
    properties: properties as ComponentSchema["properties"],
  };
}

function unwrapSchema(schema: unknown): any {
  let current = schema as any;
  while (current) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
      continue;
    }
    if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodReadonly ||
      current instanceof z.ZodCatch
    ) {
      current = current._def?.innerType;
      continue;
    }
    return current;
  }
  return current;
}

function getScalarSchemaType(schema: any): CodecSchemaType | undefined {
  if (schema instanceof z.ZodString || schema instanceof z.ZodEnum) {
    return "string";
  }
  if (schema instanceof z.ZodNumber) {
    return "number";
  }
  if (schema instanceof z.ZodBoolean) {
    return "boolean";
  }
  if (schema instanceof z.ZodLiteral) {
    const literalValue = Array.isArray(schema.values) ? schema.values[0] : schema.value;
    return typeof literalValue === "string" ||
      typeof literalValue === "number" ||
      typeof literalValue === "boolean"
      ? SCALAR_TYPES[typeof literalValue]
      : undefined;
  }
  if (schema instanceof z.ZodArray) {
    const element = unwrapSchema(schema.element);
    const elementScalarType = getScalarSchemaType(element);
    if (elementScalarType === "string" || elementScalarType === "number" || elementScalarType === "boolean") {
      return `${elementScalarType}[]` as CodecSchemaType;
    }
    if (element instanceof z.ZodArray && getScalarSchemaType(unwrapSchema(element.element)) === "number") {
      return "number[][]";
    }
    return undefined;
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema.options as unknown[]).map((option) => getScalarSchemaType(unwrapSchema(option)));
    const first = options[0];
    if (first && options.every((option) => option === first)) {
      return first;
    }
  }
  return undefined;
}

function isHtmlSafeAttributeName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name);
}
