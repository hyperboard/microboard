import { Subject } from "Subject";
import { Connector, Mbr, RichText, Shape, ShapeData } from "../Items";
import { Item, ItemData } from "../Items";
import { SelectionItems } from "./SelectionItems";
import { Board } from "Board";
import { HorisontalAlignment, VerticalAlignment } from "../Items/Alignment";
import { BorderStyle } from "../Items/Path";
import { ShapeType } from "../Items/Shape/Basic";
import { TextStyle } from "Board/Items/RichText/Editor/TextNode";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Events, Operation } from "Board/Events";
import { createCommand } from "../Events/Command";
import { SelectionTransformer } from "./SelectionTransformer";
import { Drawing } from "Board/Items/Drawing";
import {
	BoardPoint,
	ConnectorLineStyle,
	ControlPoint,
} from "Board/Items/Connector";
import { toFiniteNumber } from "utils";
import { Sticker } from "Board/Items/Sticker";

const defaultShapeData = new ShapeData();

export type SelectionContext =
	| "SelectUnderPointer"
	| "EditUnderPointer"
	| "EditTextUnderPointer"
	| "SelectByRect"
	| "None";

export class Selection {
	readonly subject = new Subject<Selection>();
	readonly itemSubject = new Subject<Item>();
	readonly itemsSubject = new Subject<Item[]>();
	isOn = true;
	private context: SelectionContext = "None";
	readonly items = new SelectionItems();

	readonly tool = new SelectionTransformer(this.board, this);

	textToEdit: RichText | undefined;

	constructor(private board: Board, private events?: Events) {
		requestAnimationFrame(this.updateScheduledObservers);
	}

	private emit(operation: Operation): void {
		if (this.events) {
			const command = createCommand(this.events, this.board, operation);
			command.apply();
			this.events.emit(operation, command);
		}
	}

	updateQueue: Set<() => void> = new Set();

	decorateObserverToScheduleUpdate(observer: () => void): () => void {
		return () => {
			if (!this.updateQueue.has(observer)) {
				this.updateQueue.add(observer);
			}
		};
	}

	updateScheduledObservers = (): void => {
		for (const observer of this.updateQueue) {
			observer();
		}
		this.updateQueue.clear();
		requestAnimationFrame(this.updateScheduledObservers);
	};

	private itemObserver = (item: Item) => {
		this.subject.publish(this);
		this.itemSubject.publish(item);
	};

	decoratedItemObserver = this.decorateObserverToScheduleUpdate(
		this.itemObserver,
	);

	add(value: Item | Item[]): void {
		this.items.add(value);
		if (Array.isArray(value)) {
			for (const item of value) {
				item.subject.subscribe(this.itemObserver);
			}
		} else {
			value.subject.subscribe(this.itemObserver);
		}
		this.subject.publish(this);
		this.itemsSubject.publish([]);
	}

	remove(value: Item | Item[]): void {
		this.items.remove(value);
		if (Array.isArray(value)) {
			for (const item of value) {
				item.subject.unsubscribe(this.itemObserver);
			}
		} else {
			value.subject.unsubscribe(this.itemObserver);
		}
		if (this.items.isEmpty()) {
			this.setContext("None");
		}
		this.subject.publish(this);
		this.itemsSubject.publish([]);
	}

	removeAll(): void {
		this.items.removeAll();
		this.setContext("None");
		this.subject.publish(this);
		this.itemsSubject.publish([]);
	}

	getContext(): SelectionContext {
		return this.context;
	}

	timeoutID: number | null = null;

	on = (): void => {
		// Cancel any existing timeout when on is explicitly called
		if (this.timeoutID !== null) {
			clearTimeout(this.timeoutID);
			this.timeoutID = null;
		}

		this.isOn = true;
		this.subject.publish(this);
	};

	off = (): void => {
		this.isOn = false;
		// Clear any existing timeout
		if (this.timeoutID !== null) {
			clearTimeout(this.timeoutID);
		}
		// Set a new timeout and keep its ID
		this.timeoutID = setTimeout(this.on, 500);
	};

	setContext(context: SelectionContext): void {
		this.context = context;
		if (context !== "EditTextUnderPointer") {
			this.setTextToEdit(undefined);
		}
		this.subject.publish(this);
		this.itemsSubject.publish([]);
	}

	getMbr(): Mbr | undefined {
		return this.items.getMbr();
	}

	selectUnderPointer(): void {
		this.removeAll();
		const stack = this.board.items.getUnderPointer();
		const top = stack.pop();
		if (top) {
			this.add(top);
			this.setTextToEdit(undefined);
			this.setContext("SelectUnderPointer");
		} else {
			this.setContext("None");
		}
	}

	editSelected(): void {
		if (this.items.isEmpty()) {
			return;
		}
		if (this.items.isSingle()) {
			const item = this.items.getSingle();
			if (item && item.itemType === "RichText") {
				// this.setTextToEdit(item);
				this.setContext("EditTextUnderPointer");
				this.board.items.subject.publish(this.board.items);
			} else {
				this.setContext("EditUnderPointer");
			}
		} else {
			this.setContext("EditUnderPointer");
		}
		this.board.tools.select();
	}

	editText(): void {
		if (this.items.isEmpty()) {
			return;
		}
		if (!this.items.isSingle()) {
			return;
		}
		const item = this.items.getSingle();
		if (!item) {
			return;
		}
		if (["Shape", "Sticker", "RichText", "Connector"].indexOf(item.itemType) > -1) {
			this.setTextToEdit(item);
			this.setContext("EditTextUnderPointer");
			this.board.items.subject.publish(this.board.items);
		}
	}

	editUnderPointer(): void {
		this.removeAll();
		const stack = this.board.items.getUnderPointer();
		const top = stack.pop();
		if (top) {
			this.add(top);
			this.setTextToEdit(undefined);
			if (
				top.itemType === "RichText" ||
				top.itemType === "Shape" ||
				top.itemType === "Sticker" ||
				top.itemType === "Connector"
			) {
				// this.setTextToEdit(top);
				const item = this.items.getSingle();
				if (item) {
					this.setTextToEdit(item);
				}
				this.setContext("EditUnderPointer");
				this.board.items.subject.publish(this.board.items);
			} else {
				this.setContext("EditUnderPointer");
			}
		} else {
			this.setContext("None");
		}
	}

	setTextToEdit(item: Item | undefined): void {
		if (this.textToEdit) {
			this.textToEdit.enableRender();
		}
		if (
			!item ||
			(["RichText", "Shape", "Sticker", "Connector"].indexOf(item.itemType) === -1) 
		) {
			this.textToEdit = undefined;
			return;
		}
		const text = item.itemType === "RichText" ? item : item.text;
		this.textToEdit = text;
		text.selectText();
		this.textToEdit.disableRender();
		this.board.items.subject.publish(this.board.items);
	}

	editTextUnderPointer(): void {
		this.removeAll();
		const stack = this.board.items.getUnderPointer();
		const top = stack.pop();
		if (top) {
			this.add(top);
			// this.setTextToEdit(top);
			this.setContext("EditTextUnderPointer");
			this.board.items.subject.publish(this.board.items);
		} else {
			this.setContext("None");
		}
	}

	selectEnclosedBy(rect: Mbr): void {
		this.removeAll();
		const list = this.board.items.getEnclosed(
			rect.left,
			rect.top,
			rect.right,
			rect.bottom,
		);
		if (list.length !== 0) {
			this.add(list);
			this.setContext("SelectByRect");
		} else {
			this.setContext("None");
		}
	}

	selectEnclosedOrCrossedBy(rect: Mbr): void {
		this.removeAll();
		const list = this.board.items.getEnclosed(
			rect.left,
			rect.top,
			rect.right,
			rect.bottom,
		);
		if (list.length !== 0) {
			this.add(list);
			this.setContext("SelectByRect");
		} else {
			this.setContext("None");
		}
	}

	list(): Item[] {
		return this.items.list();
	}

	canChangeText(): boolean {
		return (
			this.items.isSingle() &&
			this.items.isItemTypes([
				"Shape",
				"Sticker",
				"Connector",
				"RichText",
			])
		);
	}

	copy(): { [key: string]: ItemData } {
		const copiedItemsMap: { [key: string]: ItemData } = {};
		this.list().forEach(item => {
			const serializedData = item.serialize();
			// If the item is a Connector and the connected items are not part of selection,
			// change the control points to BoardPoint.
			if (item.itemType === "Connector") {
				const connector = item as Connector;
				const startPoint = connector.getStartPoint();
				const endPoint = connector.getEndPoint();

				// If the start or end point items are not in the selection,
				// change them to BoardPoints with the current absolute position.
				if (
					startPoint.pointType !== "Board" &&
					!this.items.findById(startPoint.item.getId())
				) {
					const newStartPointPos = connector.getStartPoint();
					serializedData.startPoint = new BoardPoint(
						newStartPointPos.x,
						newStartPointPos.y,
					).serialize();
				}

				if (
					endPoint.pointType !== "Board" &&
					!this.items.findById(endPoint.item.getId())
				) {
					const newEndPointPos = connector.getEndPoint();
					serializedData.endPoint = new BoardPoint(
						newEndPointPos.x,
						newEndPointPos.y,
					).serialize();
				}
			}
			copiedItemsMap[item.getId()] = serializedData;
		});
		return copiedItemsMap;
	}

	cut(): { [key: string]: ItemData } {
		const items = this.copy();
		this.removeFromBoard();
		return items;
	}

	getText(): RichText | undefined {
		const item = this.items.getItemsByItemTypes([
			"RichText",
			"Shape",
			"Sticker",
			"Connector",
		])[0] as RichText | Shape | undefined;
		const text = item?.itemType === "RichText" ? item : item?.text;
		return text;
	}

	getFontSize(): number {
		const fontSize = this.getText()?.getFontSize() || 14;
		return Math.round(fontSize);
	}

	getFontHighlight(): string {
		const color = this.getText()?.getFontHighlight() || "none";
		return color;
	}

	getFontColor(): string {
		const color = this.getText()?.getFontColor() || "none";
		return color;
	}

	getFillColor(): string {
		const tmp = this.items.getItemsByItemTypes(["Shape", "Sticker"])[0];
		return tmp?.getBackgroundColor() || defaultShapeData.backgroundColor;
	}

	getBorderStyle(): string {
		const shape = this.items.getItemsByItemTypes([
			"Shape",
			"Drawing",
		])[0] as Shape | Drawing | undefined;
		return shape?.getBorderStyle() || defaultShapeData.borderStyle;
	}

	getStrokeColor(): string {
		const shape = this.items.getItemsByItemTypes([
			"Shape",
			"Drawing",
		])[0] as Shape | Drawing | undefined;
		return shape?.getStrokeColor() || defaultShapeData.borderColor;
	}

	getStrokeWidth(): number {
		const shape = this.items.getItemsByItemTypes([
			"Shape",
			"Drawing",
		])[0] as Shape | Drawing | undefined;
		return shape?.getStrokeWidth() || defaultShapeData.borderWidth;
	}

	getStartPointerStyle(): string {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as
			| Connector
			| undefined;
		return pointer?.getStartPointerStyle() || "none";
	}

	getEndPointerStyle(): string {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as
			| Connector
			| undefined;
		return pointer?.getEndPointerStyle() || "none";
	}

	setStartPointerStyle(style: string): void {
		this.emit({
			class: "Connector",
			method: "setStartPointerStyle",
			item: this.items.ids(),
			startPointerStyle: style,
		});
	}

	setEndPointerStyle(style: string): void {
		this.emit({
			class: "Connector",
			method: "setEndPointerStyle",
			item: this.items.ids(),
			endPointerStyle: style,
		});
	}

	setConnectorLineStyle(style: ConnectorLineStyle): void {
		this.emit({
			class: "Connector",
			method: "setLineStyle",
			item: this.items.ids(),
			lineStyle: style,
		});
	}

	getConnectorLineStyle(): string {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as
			| Connector
			| undefined;
		return pointer?.getLineStyle() || "none";
	}

	getTextToEdit(): RichText[] {
		if (this.context !== "EditTextUnderPointer") {
			return [];
		}
		if (!this.textToEdit) {
			return [];
		}
		return [this.textToEdit];
	}

	translateBy(x: number, y: number): void {
		this.emit({
			class: "Transformation",
			method: "translateBy",
			item: this.items.ids(),
			x,
			y,
		});
		this.off();
	}

	scaleBy(x: number, y: number): void {
		this.emit({
			class: "Transformation",
			method: "scaleBy",
			item: this.items.ids(),
			x,
			y,
		});
	}

	setStrokeStyle(borderStyle: BorderStyle): void {
		const shapes = this.items.getIdsByItemTypes(["Shape"]);
		if (shapes.length > 0) {
			this.emit({
				class: "Shape",
				method: "setBorderStyle",
				item: shapes,
				borderStyle,
			});
		}
		const connectors = this.items.getIdsByItemTypes(["Connector"]);
		if (connectors.length > 0) {
			this.emit({
				class: "Connector",
				method: "setLineStyle",
				item: connectors,
				lineStyle: borderStyle,
			});
		}
		const drawings = this.items.getIdsByItemTypes(["Drawing"]);
		if (drawings.length > 0) {
			this.emit({
				class: "Drawing",
				method: "setStrokeStyle",
				item: drawings,
				style: borderStyle,
			});
		}
	}

	setStrokeColor(borderColor: string): void {
		const shapes = this.items.getIdsByItemTypes(["Shape"]);
		if (shapes.length > 0) {
			this.emit({
				class: "Shape",
				method: "setBorderColor",
				item: shapes,
				borderColor,
			});
		}
		const connectors = this.items.getIdsByItemTypes(["Connector"]);
		if (connectors.length > 0) {
			this.emit({
				class: "Connector",
				method: "setLineStyle",
				item: connectors,
				lineColor: borderColor,
			});
		}
		const drawings = this.items.getIdsByItemTypes(["Drawing"]);
		if (drawings.length > 0) {
			this.emit({
				class: "Drawing",
				method: "setStrokeColor",
				item: drawings,
				color: borderColor,
			});
		}
	}

	setStrokeWidth(width: number): void {
		const shapes = this.items.getIdsByItemTypes(["Shape"]);
		if (shapes.length > 0) {
			this.emit({
				class: "Shape",
				method: "setBorderWidth",
				item: shapes,
				borderWidth: width,
			});
		}
		const connectors = this.items.getIdsByItemTypes(["Connector"]);
		if (connectors.length > 0) {
			this.emit({
				class: "Connector",
				method: "setLineWidth",
				item: connectors,
				lineWidth: width,
			});
		}
		const drawings = this.items.getIdsByItemTypes(["Drawing"]);
		if (drawings.length > 0) {
			this.emit({
				class: "Drawing",
				method: "setStrokeWidth",
				item: drawings,
				width: width,
			});
		}
	}

	setFillColor(backgroundColor: string): void {
		const shapes = this.items.getIdsByItemTypes(["Shape"]);
		if (shapes.length) {
			this.emit({
				class: "Shape",
				method: "setBackgroundColor",
				item: shapes,
				backgroundColor,
			});
		}
		const stickers = this.items.getIdsByItemTypes(["Sticker"]);
		if (stickers.length) {
			this.emit({
				class: "Sticker",
				method: "setBackgroundColor",
				item: stickers,
				backgroundColor,
			});
		}
	}

	setShapeType(shapeType: ShapeType): void {
		this.emit({
			class: "Shape",
			method: "setShapeType",
			item: this.items.ids(),
			shapeType,
		});
	}

	setFontSize(size: number): void {
		const fontSize = toFiniteNumber(size);
		if (this.items.isSingle()) {
			const item = this.items.list()[0];
			if (item) {
				if (
					["Shape", "Sticker", "Connector"].indexOf(item.itemType) !==
					-1
				) {
					item.text.setSelectionFontSize(fontSize);
				} else if (item.itemType === "RichText") {
					item.setSelectionFontSize(fontSize);
				}
			}
		} else if (this.items.isItemTypes(["Sticker"])) {
			this.items
				.list()
				.forEach(x => x.text.setSelectionFontSize(fontSize));
		} else {
			this.emit({
				class: "RichText",
				method: "setFontSize",
				item: this.items.ids(),
				fontSize,
			});
		}
	}

	setFontStyle(fontStyleList: TextStyle[]): void {
		const single = this.items.getSingle();
		if (single) {
			if (single instanceof RichText) {
				single.setSelectionFontStyle(fontStyleList, this.context);
			} else {
				single.text.setSelectionFontStyle(fontStyleList, this.context);
			}
		} else if (this.items.isItemTypes(["Sticker"])) {
			this.items
				.list()
				.forEach(x => x.text.setSelectionFontStyle(fontStyleList));
		} else {
			this.emit({
				class: "RichText",
				method: "setFontStyle",
				item: this.items.ids(),
				fontStyleList,
			});
		}
	}

	setFontColor(fontColor: string): void {
		if (this.items.isSingle()) {
			const item = this.items.list()[0];
			if (item) {
				if (
					["Shape", "Sticker", "Connector"].indexOf(item.itemType) !==
					-1
				) {
					item.text.setSelectionFontColor(fontColor);
				} else if (item.itemType === "RichText") {
					item.setSelectionFontColor(fontColor);
				}
			}
		} else {
			this.emit({
				class: "RichText",
				method: "setFontColor",
				item: this.items.ids(),
				fontColor,
			});
		}
	}

	setFontHighlight(fontHighlight: string): void {
		if (this.items.isSingle()) {
			const item = this.items.list()[0];
			if (item) {
				if (
					["Shape", "Sticker", "Connector"].indexOf(item.itemType) !==
					-1
				) {
					item.text.setSelectionFontHighlight(fontHighlight);
				} else if (item.itemType === "RichText") {
					item.setSelectionFontHighlight(fontHighlight);
				}
			}
		} else {
			{
				this.emit({
					class: "RichText",
					method: "setFontHighlight",
					item: this.items.ids(),
					fontHighlight,
				});
			}
		}
	}

	setHorisontalAlignment(horisontalAlignment: HorisontalAlignment): void {
		const single = this.items.getSingle();
		if (single) {
			if (single instanceof Shape
				|| single instanceof Sticker
				|| single instanceof Connector) {
					single.text.setSelectionHorisontalAlignment(horisontalAlignment);
				}
			else if (single instanceof RichText) {
				single.setSelectionHorisontalAlignment(horisontalAlignment);
			}
		} else if (this.items.isItemTypes(["Sticker"])) {
			this.items
				.list()
				.forEach(x => x.text.setSelectionHorisontalAlignment(horisontalAlignment));
		} else {
			this.emit({
				class: "RichText",
				method: "setHorisontalAlignment",
				item: this.items.ids(),
				horisontalAlignment,
			});
		}
	}

	setVerticalAlignment(verticalAlignment: VerticalAlignment): void {
		this.emit({
			class: "RichText",
			method: "setVerticalAlignment",
			item: this.items.ids(),
			verticalAlignment,
		});
	}

	removeFromBoard(): void {
		this.emit({
			class: "Board",
			method: "remove",
			item: this.items.ids(),
		});
		this.setContext("None");
	}

	isLocked(): boolean {
		return false;
	}

	lock(): void {
		this.emit({
			class: "Board",
			method: "lock",
			item: this.items.ids(),
		});
	}

	unlock(): void {
		this.emit({
			class: "Board",
			method: "unlock",
			item: this.items.ids(),
		});
	}

	duplicate(): void {
		this.board.duplicate(this.copy());
	}

	render(context: DrawingContext): void {
		const single = this.items.getSingle();
		const isSingleConnector = single && single.itemType === "Connector";
		const isSelectionTooBig = this.items.getSize() > 100;
		if (!isSingleConnector && !isSelectionTooBig) {
			for (const item of this.items.list()) {
				const mbr = item.getMbr();
				mbr.strokeWidth = 1 / context.matrix.scaleX;
				mbr.borderColor = "rgba(0, 0, 255, 0.4)";
				mbr.render(context);
			}
		}
		this.tool.render(context);
	}
}
