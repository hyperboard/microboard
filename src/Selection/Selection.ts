import { Board } from "Board";
import { Events, Operation } from "Board/Events";
import {
	BoardPoint,
	ConnectorData,
	ConnectorLineStyle,
} from "Board/Items/Connector";
import { DrawingContext } from "Board/Items/DrawingContext";
import { FrameType } from "Board/Items/Frame/Basic";
import { TextStyle } from "Board/Items/RichText/Editor/TextNode";
import { DefaultShapeData } from "Board/Items/Shape/ShapeData";
import { Sticker } from "Board/Items/Sticker";
import { Subject } from "Subject";
import { toFiniteNumber } from "utils";
import { SELECTION_COLOR } from "View/Tools/Selection";
import { createCommand } from "../Events/Command";
import {
	Connector,
	Frame,
	Item,
	ItemData,
	Matrix,
	Mbr,
	Point,
	RichText,
	Shape,
	TransformationOperation,
} from "../Items";
import { HorisontalAlignment, VerticalAlignment } from "../Items/Alignment";
import { BorderStyle } from "../Items/Path";
import { ShapeType } from "../Items/Shape/Basic";
import { SelectionItems } from "./SelectionItems";
import { SelectionTransformer } from "./SelectionTransformer";
import { ControlPointData } from "Board/Items/Connector/ControlPoint";
import { getQuickAddButtons, QuickAddButtons } from "./QuickAddButtons";

const defaultShapeData = new DefaultShapeData();

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
	shouldPublish = true;
	readonly tool = new SelectionTransformer(this.board, this);
	textToEdit: RichText | undefined;
	transformationRenderBlock?: boolean = undefined;

	quickAddButtons: QuickAddButtons = getQuickAddButtons(this, this.board);

	constructor(private board: Board, public events?: Events) {
		requestAnimationFrame(this.updateScheduledObservers);
	}

	serialize(): string {
		const selectedItems = this.items.list().map(item => item.getId());
		return JSON.stringify(selectedItems);
	}

	deserialize(serializedData: string): void {
		const selectedItems: string[] = JSON.parse(serializedData);
		this.removeAll();
		selectedItems.forEach(itemId => {
			const item = this.board.items.find(item => item.getId() === itemId);
			if (item) {
				this.items.push(item);
			}
		});
	}

	private emit(operation: Operation): void {
		if (this.events) {
			const command = createCommand(this.board, operation);
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

	private itemObserver = (item: Item): void => {
		if (!this.shouldPublish) {
			return;
		}
		this.quickAddButtons.clear();
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

	addAll() {
		const items = this.board.items.listAll();
		this.add(items);
		this.setContext("SelectByRect");
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
		const single = this.items.getSingle();
		if (single instanceof RichText && single.isEmpty()) {
			this.board.remove(single);
		}
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
	disable(): void {
		this.isOn = false;
		this.setContext("None");
		this.items.removeAll();
		this.subject.publish(this);
	}

	setContext(context: SelectionContext): void {
		this.context = context;
		if (context !== "EditTextUnderPointer") {
			this.setTextToEdit(undefined);
		}
		if (context === "None") {
			this.quickAddButtons.clear();
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

	editText(shouldReplace?: string): void {
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
		if (
			item instanceof Shape ||
			item instanceof Sticker ||
			item instanceof Connector ||
			item instanceof RichText ||
			item instanceof Frame
		) {
			if (shouldReplace) {
				const text = item instanceof RichText ? item : item.text;
				text.clearText();
				text.editor.editor.insertText(shouldReplace);
				text.moveCursorToEnd();
			}
			this.setTextToEdit(item);
			this.setContext("EditTextUnderPointer");
			this.board.items.subject.publish(this.board.items);
		}
	}

	async appendText(appendedText: string) {
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
		if (
			item instanceof Shape ||
			item instanceof Sticker ||
			item instanceof Connector ||
			item instanceof RichText ||
			item instanceof Frame
		) {
			const text = item instanceof RichText ? item : item.text;
			await text.moveCursorToEnd(); // prob should be 20 ms
			text.editor.appendText(appendedText);
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
				top.itemType === "Connector" ||
				top.itemType === "Frame"
			) {
				// this.setTextToEdit(top);
				const item = this.items.getSingle();
				if (item) {
					this.setTextToEdit(item);
				}
				this.setContext("EditUnderPointer");
				if ("text" in top) {
					top.text.selectWholeText();
				} else {
					top.selectWholeText();
				}
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
			this.textToEdit.updateElement();
			this.textToEdit.enableRender();
		}
		if (
			!item ||
			(!(item instanceof RichText) &&
				!(item instanceof Shape) &&
				!(item instanceof Sticker) &&
				!(item instanceof Frame) &&
				!(item instanceof Connector))
		) {
			this.textToEdit = undefined;
			return;
		}
		if (item instanceof Connector && item.text.isEmpty()) {
			item.text.selectWholeText();
			const textColor = localStorage.getItem("lastConnectorTextColor");
			const textSize = Number(
				localStorage.getItem("lastConnectorTextSize"),
			);
			if (textColor) {
				item.text.setSelectionFontColor(textColor);
			}
			if (textSize && !Number.isNaN(textSize)) {
				item.text.setSelectionFontSize(textSize);
			}
		}
		const text = item instanceof RichText ? item : item.text;
		this.textToEdit = text;
		text.selectWholeText();
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
		const enclosedFrames = this.board.items
			.getEnclosed(rect.left, rect.top, rect.right, rect.bottom)
			.filter(item => item instanceof Frame);
		const list = this.board.items
			.getEnclosedOrCrossed(rect.left, rect.top, rect.right, rect.bottom)
			.filter(
				item =>
					!(item instanceof Frame) || enclosedFrames.includes(item),
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
				"Frame",
				"RichText",
			])
		);
	}

	private handleItemCopy(
		item: Item,
		copiedItemsMap: { [key: string]: ItemData },
	): void {
		const serializedData = item.serialize();
		const zIndex = this.board.items.index.getZIndex(item);
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
		copiedItemsMap[item.getId()] = { ...serializedData, zIndex };
	}

	copy(): { [key: string]: ItemData } {
		const copiedItemsMap: { [key: string]: ItemData } = {};
		this.list().forEach(item => {
			this.handleItemCopy(item, copiedItemsMap);
		});

		this.list()
			.flatMap(item => {
				if (item instanceof Frame) {
					return item.getChildrenIds();
				}
				return [];
			})
			.forEach(id => {
				if (!(id in copiedItemsMap)) {
					const childItem = this.board.items.getById(id);
					if (!childItem) {
						throw new Error(
							`Didn't find item with ${id} while copying`,
						);
					}
					this.handleItemCopy(childItem, copiedItemsMap);
				}
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
			"Frame",
		])[0];
		return item instanceof RichText ? item : item?.text;
	}

	isTextEmpty(): boolean {
		return this.getText()?.isEmpty() || false;
	}

	getAutosize(): boolean {
		const sticker = this.items.getItemsByItemTypes(["Sticker"])[0];
		return sticker?.text.getAutosize() || false;
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
		const tmp = this.items.getItemsByItemTypes([
			"Shape",
			"Sticker",
			"Frame",
		])[0];
		return tmp?.getBackgroundColor() || defaultShapeData.backgroundColor;
	}

	getBorderStyle(): string {
		const shape = this.items.getItemsByItemTypes(["Shape", "Drawing"])[0];
		return shape?.getBorderStyle() || defaultShapeData.borderStyle;
	}

	getStrokeColor(): string {
		const shape = this.items.getItemsByItemTypes(["Shape", "Drawing"])[0];
		return shape?.getStrokeColor() || defaultShapeData.borderColor;
	}

	getStrokeWidth(): number {
		const shape = this.items.getItemsByItemTypes(["Shape", "Drawing"])[0];
		return shape?.getStrokeWidth() || defaultShapeData.borderWidth;
	}

	getStartPointerStyle(): string {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0];
		return pointer?.getStartPointerStyle() || "none";
	}

	getEndPointerStyle(): string {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0];
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

	switchPointers(): void {
		this.emit({
			class: "Connector",
			method: "switchPointers",
			item: this.items.ids(),
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
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0];
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

	translateBy(x: number, y: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "translateBy",
			item: this.items.ids(),
			x,
			y,
			timeStamp,
		});
		this.off();
	}

	scaleBy(x: number, y: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "scaleBy",
			item: this.items.ids(),
			x,
			y,
			timeStamp,
		});
	}

	scaleByTranslateBy(
		scale: { x: number; y: number },
		translate: { x: number; y: number },
		timeStamp?: number,
	): void {
		this.emit({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: this.items.ids(),
			scale,
			translate,
			timeStamp,
		});
	}

	// TODO all the other transformations are redundant, use this one for everything
	// Instead of TransformationOperation just put matrix in it
	transformMany(
		items: { [key: string]: TransformationOperation },
		timeStamp?: number,
	): void {
		this.shouldPublish = false;
		this.emit({
			class: "Transformation",
			method: "transformMany",
			items,
			timeStamp,
		});
		this.shouldPublish = true;
	}

	setStrokeStyle(borderStyle: BorderStyle): void {
		// TODO make single operation to set strokeStyle on any item with stroke
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
		// TODO make single operation to set strokeColor on any item with stroke
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
		// TODO make single operation to set strokeWidth on any item with stroke
		const shapes = this.items.getIdsByItemTypes(["Shape"]);
		if (shapes.length > 0) {
			this.emit({
				class: "Shape",
				method: "setBorderWidth",
				item: shapes,
				borderWidth: width,
				prevBorderWidth: this.getStrokeWidth(),
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
				prevWidth: this.getStrokeWidth(),
			});
		}
	}

	setFillColor(backgroundColor: string): void {
		// TODO make single operation to set color on any item with fill
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
		const frames = this.items.getIdsByItemTypes(["Frame"]);
		if (frames.length) {
			this.emit({
				class: "Frame",
				method: "setBackgroundColor",
				item: frames,
				backgroundColor,
			});
		}
	}

	setCanChangeRatio(canChangeRatio: boolean): void {
		const frames = this.items.getIdsByItemTypes(["Frame"]);
		if (frames.length) {
			this.emit({
				class: "Frame",
				method: "setCanChangeRatio",
				item: frames,
				canChangeRatio,
			});
		}
	}

	getCanChangeRatio(): boolean {
		const frame = this.items.getItemsByItemTypes(["Frame"])[0] as Frame;
		return frame?.getCanChangeRatio() ?? true;
	}

	setFrameType(frameType: FrameType): void {
		// const frames = this.items.getIdsByItemTypes(["Frame"]);
		// if (frames.length) {
		// this.emit({
		// 	class: "Frame",
		// 	method: "setFrameType",
		// 	item: frames,
		// 	shapeType: frameType,
		// 	prevShapeType: this.getFrameType(),
		// });
		// }

		const frame = this.items.getSingle();

		if (frame instanceof Frame) {
			frame.setFrameType(frameType);
		}
	}

	getFrameType(): FrameType {
		const frame = this.items.getItemsByItemTypes(["Frame"])[0] as Frame;
		return frame?.getFrameType() ?? "Custom";
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
		const single = this.items.getSingle();
		if (single) {
			// TODO add getTextEditor method to each item to avoid instanceof checks
			if (single instanceof RichText) {
				single.setSelectionFontSize(fontSize, this.getContext());
			} else if (
				single instanceof Shape ||
				single instanceof Sticker ||
				single instanceof Frame
			) {
				single.text.setSelectionFontSize(fontSize, this.getContext());
			} else if (single instanceof Connector) {
				localStorage.setItem("lastConnectorTextSize", `${fontSize}`);
				single.text.setSelectionFontSize(fontSize, this.getContext());
			}
		} else if (this.items.isItemTypes(["Sticker"])) {
			this.items
				.list()
				.forEach(x =>
					x.text.setSelectionFontSize(fontSize, this.getContext()),
				);
		} else {
			// this.emit({
			// 	class: "RichText",
			// 	method: "setFontSize",
			// 	item: this.items.ids(),
			// 	fontSize,
			// });

			this.items.list().forEach(item => {
				if (item instanceof RichText) {
					item.setSelectionFontSize(fontSize);
				}
			});
		}
	}

	setFontStyle(fontStyle: TextStyle): void {
		const single = this.items.getSingle();
		if (single) {
			if (single instanceof RichText) {
				single.setSelectionFontStyle(fontStyle, this.context);
			} else if ("text" in single) {
				single.text.setSelectionFontStyle(fontStyle, this.context);
			}
		} else {
			const filteredItems = this.items
				.list()
				.filter(
					item =>
						item.itemType === "RichText" ||
						item.itemType === "Shape" ||
						item.itemType === "Sticker" ||
						item.itemType === "Connector" ||
						item.itemType === "Frame",
				);

			const changedItems = filteredItems.filter(item => {
				if (item instanceof RichText) {
					return !item.getFontStyles().includes(fontStyle);
				}
				return !item.text.getFontStyles().includes(fontStyle);
			});
			if (changedItems.length > 0) {
				changedItems.forEach(item => {
					if (item instanceof RichText) {
						item.setSelectionFontStyle(fontStyle, this.context);
					} else {
						item.text.setSelectionFontStyle(
							fontStyle,
							this.context,
						);
					}
				});
			} else {
				filteredItems.forEach(item => {
					if (item instanceof RichText) {
						item.setSelectionFontStyle(fontStyle, this.context);
					} else {
						item.text.setSelectionFontStyle(
							fontStyle,
							this.context,
						);
					}
				});
			}
		}
	}

	setFontColor(fontColor: string): void {
		if (this.items.isSingle()) {
			const item = this.items.getSingle();
			if (item instanceof RichText) {
				item.setSelectionFontColor(fontColor, this.context);
				return;
			}
			if (
				item &&
				(item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Frame")
			) {
				(item as Shape | Sticker | Frame).text.setSelectionFontColor(
					fontColor,
					this.context,
				);
				return;
			}
			if (item instanceof Connector) {
				localStorage.setItem("lastConnectorTextColor", fontColor);
				item.text.setSelectionFontColor(fontColor, this.context);
				return;
			}
		}

		const filteredItems = this.items
			.list()
			.filter(
				item =>
					item.itemType === "RichText" ||
					item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame",
			);

		const changedIds = filteredItems
			.filter(item => {
				if (item instanceof RichText) {
					return item.getFontColor() !== fontColor;
				}
				return item.text.getFontColor() !== fontColor;
			})
			.map(item => item.getId());

		if (changedIds.length > 0) {
			this.emit({
				class: "RichText",
				method: "setFontColor",
				item: changedIds,
				fontColor,
			});
		}

		if (changedIds.length === 0) {
			this.emit({
				class: "RichText",
				method: "setFontColor",
				item: filteredItems.map(item => item.getId()),
				fontColor,
			});
		}
	}

	setFontHighlight(fontHighlight: string): void {
		if (this.items.isSingle()) {
			const item = this.items.getSingle();
			if (item instanceof RichText) {
				item.setSelectionFontHighlight(fontHighlight, this.context);
				return;
			}
			if (
				item &&
				(item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame")
			) {
				(
					item as Shape | Sticker | Connector | Frame
				).text.setSelectionFontHighlight(fontHighlight, this.context);
				return;
			}
		}

		const filteredItems = this.items
			.list()
			.filter(
				item =>
					item.itemType === "RichText" ||
					item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame",
			);

		const changedIds = filteredItems
			.filter(item => {
				if (item instanceof RichText) {
					return item.getFontHighlight() !== fontHighlight;
				}
				return item.text.getFontHighlight() !== fontHighlight;
			})
			.map(item => item.getId());

		if (changedIds.length > 0) {
			this.emit({
				class: "RichText",
				method: "setFontHighlight",
				item: changedIds,
				fontHighlight,
			});
		}

		if (changedIds.length === 0) {
			this.emit({
				class: "RichText",
				method: "setFontHighlight",
				item: filteredItems.map(item => item.getId()),
				fontHighlight,
			});
		}
	}

	setHorisontalAlignment(horisontalAlignment: HorisontalAlignment): void {
		if (this.items.isSingle()) {
			const item = this.items.getSingle();
			if (item instanceof RichText) {
				item.setSelectionHorisontalAlignment(
					horisontalAlignment,
					this.context,
				);
				return;
			}
			if (
				item &&
				(item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame")
			) {
				(
					item as Shape | Sticker | Connector | Frame
				).text.setSelectionHorisontalAlignment(
					horisontalAlignment,
					this.context,
				);
				return;
			}
		}

		const filteredItems = this.items
			.list()
			.filter(
				item =>
					item.itemType === "RichText" ||
					item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame",
			);

		const changedIds = filteredItems
			.filter(item => {
				if (item instanceof RichText) {
					return (
						item.getHorisontalAlignment() !== horisontalAlignment
					);
				}
				return (
					item.text.getHorisontalAlignment() !== horisontalAlignment
				);
			})
			.map(item => item.getId());

		if (changedIds.length > 0) {
			this.emit({
				class: "RichText",
				method: "setHorisontalAlignment",
				item: changedIds,
				horisontalAlignment,
			});
		}

		if (changedIds.length === 0) {
			this.emit({
				class: "RichText",
				method: "setHorisontalAlignment",
				item: filteredItems.map(item => item.getId()),
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

		if (this.items.isSingle()) {
			const item = this.items.getSingle();
			if (item instanceof RichText) {
				item.setEditorFocus(this.context);
			}
			if (
				item &&
				(item.itemType === "Shape" ||
					item.itemType === "Sticker" ||
					item.itemType === "Connector" ||
					item.itemType === "Frame")
			) {
				(
					item as Shape | Sticker | Connector | Frame
				).text.setEditorFocus(this.context);
			}
		}
	}

	autosizeEnable(): void {
		this.items
			.getItemsByItemTypes(["Sticker"])
			.forEach(sticker => sticker.text.autosizeEnable());
	}

	autosizeDisable(): void {
		this.items.getItemsByItemTypes(["Sticker"]).forEach(sticker => {
			if (sticker.text.getAutosize()) {
				sticker.text.autosizeDisable();
			}
		});
	}

	removeFromBoard(): void {
		this.emit({
			class: "Board",
			method: "remove",
			item: this.items.ids(),
		});
		this.board.tools.getSelect()?.toHighlight.clear();
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

	bringToFront(): void {
		this.board.bringToFront(this.items.list());
	}

	sendToBack(): void {
		this.board.sendToBack(this.items.list());
	}

	duplicate(): void {
		this.board.duplicate(this.copy());
		if (this.items.isSingle()) {
			this.setContext("EditUnderPointer");
		} else {
			this.setContext("SelectByRect");
		}
	}

	renderItemMbr(
		context: DrawingContext,
		item: Item,
		customScale?: number,
	): void {
		const mbr = item.getMbr();
		mbr.strokeWidth = !customScale
			? 1 / context.matrix.scaleX
			: 1 / customScale;
		mbr.borderColor = SELECTION_COLOR;
		mbr.render(context);
	}

	render(context: DrawingContext): void {
		const single = this.items.getSingle();
		const isSingleConnector = single && single.itemType === "Connector";

		if (isSingleConnector) {
			this.tool.render(context);
			return;
		}

		if (!this.transformationRenderBlock) {
			for (const item of this.items.list()) {
				this.renderItemMbr(context, item);
			}
			this.tool.render(context);
			this.quickAddButtons.render(context);
		}
	}
}
