export const defaultCursors = [
	"default",
	"auto",
	"text",
	"crosshair",
	"move",
	"all-scroll",
	"wait",
	"not-allowed",
	"pointer",
	"grab",
	"grabbing",
	"webkit-grab",
	"webkit-grabbing",
	"zoom-in",
	"zoom-out",
	"col-resize",
	"e-resize",
	"ew-resize",
	"n-resize",
	"ne-resize",
	"nesw-resize",
	"ns-resize",
	"nw-resize",
	"nwse-resize",
	"row-resize",
	"s-resize",
	"se-resize",
	"sw-resize",
	"w-resize",
	"alias",
	"cell",
	"context-menu",
	"copy",
	"help",
	"no-drop",
	"none",
	"progress",
	"sticker-blue",
	"sticker-yellow",
	"sticker-green",
	"sticker-red",
	"sticker-purple",
	"sticker-light-blue",
	"sticker-gray",
	"sticker-black",
] as const;

export const customCursors = ["pen", "eraser", "comment"] as const;

export type Cursor = (typeof defaultCursors)[number] | string;
export type CursorName =
	| (typeof defaultCursors)[number]
	| (typeof customCursors)[number];
export type CursorsMap = Partial<Record<CursorName, Cursor>>;

/*
export class CursorMapChangeOnToolChange implements Observer<ToolName> {
	constructor(
		private toolToMap: SureMap<ToolName, SureMap<ItemType, Cursor>>,
		private itemToCursor: Mediator<SureMap<ItemType, Cursor>>,
	) {}

	changed(name: ToolName): void {
		this.itemToCursor.change(this.toolToMap.get(name));
	}
}

export class CursorChangeOnCursorMapChange
	implements Observer<SureMap<ItemType, Cursor>>
{
	constructor(
		private hover: Mediator<ItemType>,
		private cursor: Mediator<Cursor>,
	) {}

	changed(map: SureMap<ItemType, Cursor>): void {
		this.cursor.change(map.get(this.hover.get()));
	}
}

export class CursorChangeOnHoverChange implements Observer<ItemType> {
	constructor(
		private map: SureMap<ItemType, Cursor>,
		private cursor: Mediator<Cursor>,
	) {}

	changed(type: ItemType): void {
		this.cursor.change(this.map.get(type));
	}
}
*/
