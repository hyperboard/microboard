import { describe, expect, it } from "bun:test";
import "Items"; // Import Items to trigger registration
import { validateItemData } from "./Validators";

describe("Validators", () => {
  it("should validate Shape data", () => {
    const validShape = {
      itemType: "Shape",
      shapeType: "Rectangle",
      backgroundColor: { type: "fixed", value: "red" },
      backgroundOpacity: 1,
      borderColor: { type: "semantic", id: "contrastGray" },
      borderOpacity: 1,
      borderStyle: "solid",
      borderWidth: 1,
      transformation: {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        isLocked: false,
      },
      text: {
        children: [{ text: "Hello" }],
        verticalAlignment: "center",
        placeholderText: "",
        realSize: "auto",
      },
    };
    expect(validateItemData(validShape)).toBe(true);

    const invalidShape = { ...validShape, shapeType: 123 };
    expect(validateItemData(invalidShape)).toBe(false);
  });

  it("should validate Sticker data", () => {
    const validSticker = {
      itemType: "Sticker",
      backgroundColor: { type: "fixed", value: "yellow" },
      transformation: {
        translateX: 10,
        translateY: 20,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      },
      text: {
        children: [{ text: "Sticker text" }],
      },
    };
    expect(validateItemData(validSticker)).toBe(true);
  });

  it("should validate RichText data", () => {
    const validRichText = {
      itemType: "RichText",
      children: [
        {
          type: "paragraph",
          children: [{ text: "Paragraph" }],
        },
      ],
      verticalAlignment: "top",
      realSize: "auto",
    };
    expect(validateItemData(validRichText)).toBe(true);

    const invalidRichText = {
      itemType: "RichText",
      children: [
        {
          type: "invalid_type",
          children: [{ text: "Error" }],
        },
      ],
    };
    expect(validateItemData(invalidRichText)).toBe(false);
  });

  it("should validate Connector data", () => {
    const validConnector = {
      itemType: "Connector",
      startPoint: { pointType: "Board", x: 0, y: 0 },
      endPoint: { pointType: "Board", x: 100, y: 100 },
      startPointerStyle: "None",
      endPointerStyle: "ArrowThin",
      lineStyle: "straight",
      lineColor: { type: "fixed", value: "black" },
      lineWidth: 1,
      transformation: {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      },
      text: { children: [] },
    };
    expect(validateItemData(validConnector)).toBe(true);
  });

  it("should validate Group data with childIds or children", () => {
    const validGroupWithIds = {
      itemType: "Group",
      childIds: ["item1", "item2"],
      transformation: {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      },
    };
    expect(validateItemData(validGroupWithIds)).toBe(true);

    const validGroupWithChildren = {
      itemType: "Group",
      children: ["item1", "item2"],
      transformation: {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      },
    };
    expect(validateItemData(validGroupWithChildren)).toBe(true);
  });
});
