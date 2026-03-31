import { ColorValue } from "../../Color";
import { BorderStyle } from "../Path";
import { ShapeOperation } from "./ShapeOperation";
import { ShapeType } from "./ShapeType";

type ItemLike = { getId(): string; getBorderWidth?(): number };
type ItemOrId = ItemLike | string;

function idsOf(items: readonly ItemOrId[]): string[] {
	return items.map((item) => (typeof item === "string" ? item : item.getId()));
}

export const shapeOps = {
	setBackgroundColor(items: readonly ItemOrId[], backgroundColor: ColorValue): ShapeOperation {
		return {
			class: "Shape",
			method: "setBackgroundColor",
			item: idsOf(items),
			backgroundColor,
		};
	},

	setBackgroundOpacity(items: readonly ItemOrId[], backgroundOpacity: number): ShapeOperation {
		return {
			class: "Shape",
			method: "setBackgroundOpacity",
			item: idsOf(items),
			backgroundOpacity,
		};
	},

	setBorderColor(items: readonly ItemOrId[], borderColor: ColorValue): ShapeOperation {
		return {
			class: "Shape",
			method: "setBorderColor",
			item: idsOf(items),
			borderColor,
		};
	},

	setBorderOpacity(items: readonly ItemOrId[], borderOpacity: number): ShapeOperation {
		return {
			class: "Shape",
			method: "setBorderOpacity",
			item: idsOf(items),
			borderOpacity,
		};
	},

	setBorderStyle(items: readonly ItemOrId[], borderStyle: BorderStyle): ShapeOperation {
		return {
			class: "Shape",
			method: "setBorderStyle",
			item: idsOf(items),
			borderStyle,
		};
	},

	setBorderWidth(items: readonly ItemLike[], borderWidth: number): ShapeOperation {
		return {
			class: "Shape",
			method: "setBorderWidth",
			item: idsOf(items),
			borderWidth,
			prevBorderWidth: items[0]?.getBorderWidth?.() ?? 0,
		};
	},

	setShapeType(items: readonly ItemOrId[], shapeType: ShapeType): ShapeOperation {
		return {
			class: "Shape",
			method: "setShapeType",
			item: idsOf(items),
			shapeType,
		};
	},
};
