export const cursors = [
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
	// 	| "url(.cur),auto"
] as const;

export const penCursor =
	"url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAT5JREFUOI2d0rFLlWEUBvDfueLFIUHDSbibCEIOanMkbiINCW7amjpEd2uTCFp0aG8LBCcHcVCEJB3ETGjSyb8gaXHK4W3w/eS7eu8ndeB94Zzn8PCccx6YRl9Kyf+8GsZxERE7EbEcEQ3/GI9wigYWsIUfWMEEokrBzcdbvLkt0os5rOMC4w8R9GQVvS0gTXzEIWY6EuTm13hXyhs4Qj0r2sZiFUE3TvA455uYLOF1fMGn8l5qxSZTStcZbEbENC5TSl9L+J+85N/YiIieAiirqGXZPzHQduabq51jF33tGmbxHf0dCNYwj5c4aH8apvI+hu7UR7GHwHssdjYIT3CMp6Xx9jGCYXxDV6XPMVh4AEvZnYEdjLWcsYKk8MBZNtwrrBZ45KbKiIg6PuMXnuF5Sunq3hkfUBL4gBfl+l/GUJu0/4U0egAAAABJRU5ErkJggg==), auto";

export const penCursorTalk = `url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAExSURBVHgB7ZQxToVAEIYHexJbqJ4N9Uu4APaQeAQrLgA9ywE4AJUdB+ACT3qItlTaAKWGC6zzb9iXLYy4TwsL/2Symd3w55tlZokukJTywPHC8cTxgJwulTYTQsgkSWRd13IzP+LcsTXj5VSWJVaK45iqqiLXdYmNXx3HubEy02QIrXVdZRRFsu97pNHVd81MsqIozmegC4KAlmVBetw1/MoM4n3yfR/lv3P6uGv2WZlaxv6b/in/Zn/QzGwbwV1/GIZB9ZUptAbELYPWuOWJeKY9ummaZBiGcp5nOY6jnlG7Mg1C0XWdmk3P886EeZ7bkWk63B1eDtBhNpumUS+JDZlpeN+2rRpwJlFrmqZ62O3MNkNFh/vLssw0At412QofgxClsk4cd/QTbXcImoh+QR9+3PjIvsyPAQAAAABJRU5ErkJggg==) 2 18, auto`
export type Cursor = typeof cursors[number];

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
