import { Board } from "Board";
import { Events, Operation } from "Board/Events";
import { BoardPoint, ConnectorLineStyle } from "Board/Items/Connector";
import { DrawingContext } from "Board/Items/DrawingContext";
import { FrameType } from "Board/Items/Frame/Basic";
import { TextStyle } from "Board/Items/RichText/Editor/TextNode";
import { DefaultShapeData } from "Board/Items/Shape/ShapeData";
import { Sticker } from "Board/Items/Sticker";
import { Subject } from "Subject";
import { toFiniteNumber } from "utils";
import { SELECTION_COLOR, SELECTION_LOCKED_COLOR } from "View/Tools/Selection";
import { Command, createCommand } from "../Events/Command";
import {
	Connector,
	Frame,
	Item,
	ItemData,
	Mbr,
	RichText,
	Shape,
} from "../Items";
import { HorisontalAlignment, VerticalAlignment } from "../Items/Alignment";
import { BorderStyle } from "../Items/Path";
import { ShapeType } from "../Items/Shape/Basic";
import { getQuickAddButtons, QuickAddButtons } from "./QuickAddButtons";
import { SelectionItems } from "./SelectionItems";
import { SelectionTransformer } from "./SelectionTransformer";
import { ConnectorPointerStyle } from "Board/Items/Connector/Pointers/Pointers";
import { t } from "i18next";
import { TransformManyItems } from "Board/Items/Transformation/TransformationOperations";
import { ConnectionLineWidth } from "Board/Items/Connector/Connector";
import { CONNECTOR_COLOR } from "../../View/Items/Connector";
import { ItemOp } from "Board/Items/RichText/RichTextOperations";
import { tempStorage } from "App/SessionStorage";
import { Tool } from "Board/Tools/Tool";

const defaultShapeData = new DefaultShapeData();

export type SelectionContext =
	| "SelectUnderPointer"
	| "HoverUnderPointer"
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
	readonly tool: Tool;
	textToEdit: RichText | undefined;
	transformationRenderBlock?: boolean = undefined;

	quickAddButtons: QuickAddButtons;
	showQuickAddPanel = false;

	constructor(
		private board: Board,
		public events?: Events,
	) {
		requestAnimationFrame(this.updateScheduledObservers);
		this.tool = new SelectionTransformer(board, this);
		this.quickAddButtons = getQuickAddButtons(this, board);
	}

	serialize(): string {
		const selectedItems = this.items.list().map(item => item.getId());
		return JSON.stringify(selectedItems);
	}

	deserialize(serializedData: string): void {
		const selectedItems: string[] = JSON.parse(serializedData);
		this.removeAll();
		selectedItems.forEach(itemId => {
			const item = this.board.items.getById(itemId);
			if (item) {
				this.items.add(item);
			}
		});
	}

	private emit(operation: Operation): void {
		if (!this.events) {
			return;
		}
		const command = createCommand(this.board, operation);
		command.apply();
		this.events.emit(operation, command);
	}

	private emitApplied(operation: Operation): void {
		this.emitCommand(operation);
	}

	private emitCommand(operation: Operation): Command | null {
		if (!this.events) {
			return null;
		}
		const command = createCommand(this.board, operation);
		this.events.emit(operation, command);
		return command;
	}

	updateQueue: Set<() => void> = new Set();

	decorateObserverToScheduleUpdate<T extends (...args: any[]) => void>(
		observer: T,
	): T {
		return ((...args: Parameters<T>) => {
			if (!this.updateQueue.has(observer)) {
				this.updateQueue.add(() => observer(...args));
			}
		}) as T;
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
		const newValue = Array.isArray(value)
			? value.filter(
					item =>
						!(
							item instanceof Frame &&
							item.transformation.isLocked
						),
				)
			: (value as Frame).transformation.isLocked;

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

	addAll(): void {
		const items = this.board.items.listAll();
		const frames = this.board.items
			.listFrames()
			.filter(item => !item.transformation.isLocked);
		this.add(items);
		this.add(frames);
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

	timeoutID: NodeJS.Timeout | null = null;

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
		this.showQuickAddPanel = false;
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
		if (this.board.interfaceType === "view") {
			return;
		}
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

	editText(shouldReplace?: string, moveCursorToEnd = false): void {
		if (this.board.interfaceType === "view") {
			return;
		}
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
		const text = item.getRichText();
		if (!text) {
			return;
		}
		if (shouldReplace) {
			text.clearText();
			text.editor.editor.insertText(shouldReplace);
		}
		if (shouldReplace || moveCursorToEnd) {
			text.moveCursorToEnd();
		}
		this.setTextToEdit(item);
		this.setContext("EditTextUnderPointer");
		this.board.items.subject.publish(this.board.items);
	}

	async appendText(appendedText: string): Promise<void> {
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
		const text = item.getRichText();
		if (!text) {
			return;
		}
		await text.moveCursorToEnd(); // prob should be 20 ms
		text.editor.appendText(appendedText);
		this.setTextToEdit(item);
		this.setContext("EditTextUnderPointer");
		this.board.items.subject.publish(this.board.items);
	}

	editUnderPointer(): void {
		this.removeAll();
		const stack = this.board.items.getUnderPointer();
		const item = stack.pop();
		if (item) {
			this.add(item);
			this.setTextToEdit(undefined);
			const text = item.getRichText();
			if (text) {
				this.setTextToEdit(item);
				text.selectWholeText();
				this.board.items.subject.publish(this.board.items);
			}
			this.setContext("EditUnderPointer");
		} else {
			this.setContext("None");
		}
	}

	setTextToEdit(item: Item | undefined): void {
		if (this.textToEdit) {
			this.textToEdit.updateElement();
			this.textToEdit.enableRender();
		}
		if (!(item && item.getRichText())) {
			this.textToEdit = undefined;
			return;
		}
		const text = item.getRichText();
		if (!text) {
			return;
		}
		if (text.isEmpty()) {
			const textColor = tempStorage.getFontColor(item.itemType);
			const textSize = tempStorage.getFontSize(item.itemType);
			const highlightColor = tempStorage.getFontHighlight(item.itemType);
			const styles = tempStorage.getFontStyles(item.itemType);
			const horizontalAlignment = tempStorage.getHorizontalAlignment(
				item.itemType,
			);
			const verticalAlignment = tempStorage.getVerticalAlignment(
				item.itemType,
			);
			if (textColor) {
				console.log(textColor);
				text.setSelectionFontColor(textColor, "None");
			}
			if (textSize) {
				this.emit({
					class: "RichText",
					method: "setFontSize",
					item: [item.getId()],
					fontSize: textSize,
					context: this.getContext(),
				});
			}
			if (highlightColor) {
				text.setSelectionFontHighlight(highlightColor, "None");
			}
			if (styles) {
				const stylesArr = styles;
				text.setSelectionFontStyle(stylesArr, "None");
			}
			if (horizontalAlignment && !(item instanceof Sticker)) {
				text.setSelectionHorisontalAlignment(horizontalAlignment);
			}
			if (verticalAlignment && !(item instanceof Sticker)) {
				this.setVerticalAlignment(verticalAlignment);
			}
		}
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
			.filter(
				item => item instanceof Frame && !item.transformation.isLocked,
			);
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
		return Boolean(
			this.items.isSingle() && this.items.getSingle()?.getRichText(),
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
		if (
			item.itemType === "Connector" &&
			serializedData.itemType === "Connector"
		) {
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

		if (item.itemType === "Frame" && serializedData.itemType === "Frame") {
			const textItem = item.text.getTextString();
			const copyText = t("frame.copy");
			const copiedFrameText =
				copyText + (textItem || serializedData.text.placeholderText);
			item.text.clearText();
			item.text.addText(copiedFrameText);
			serializedData.text = item.text.serialize();
			item.text.clearText();
			item.text.addText(textItem);
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

	getText(): RichText | null {
		const item = this.items.getSingle();
		if (!item) {
			return null;
		}
		return item.getRichText();
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
		const shape = this.items.getItemsByItemTypes([
			"Shape",
			"Drawing",
			"Connector",
		])[0];
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

	getConnectorLineWidth(): number {
		const connector = this.items.getItemsByItemTypes(["Connector"])[0];
		return connector?.getLineWidth() || 1;
	}

	getConnectorLineColor(): string {
		const connector = this.items.getItemsByItemTypes(["Connector"])[0];
		return connector?.getLineColor() || CONNECTOR_COLOR;
	}

	getStartPointerStyle(): ConnectorPointerStyle {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0];
		return pointer?.getStartPointerStyle() || "None";
	}

	getEndPointerStyle(): ConnectorPointerStyle {
		const pointer = this.items.getItemsByItemTypes(["Connector"])[0];
		return pointer?.getEndPointerStyle() || "None";
	}

	setStartPointerStyle(style: ConnectorPointerStyle): void {
		this.emit({
			class: "Connector",
			method: "setStartPointerStyle",
			item: this.items.ids(),
			startPointerStyle: style,
		});
	}

	setEndPointerStyle(style: ConnectorPointerStyle): void {
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
	transformMany(items: TransformManyItems, timeStamp?: number): void {
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
		const drawings = this.items.getIdsByItemTypes(["Drawing"]);
		if (drawings.length > 0) {
			this.emit({
				class: "Drawing",
				method: "setStrokeStyle",
				item: drawings,
				style: borderStyle,
			});
		}
		const connectors = this.items.getIdsByItemTypes(["Connector"]);
		if (connectors.length > 0) {
			this.emit({
				class: "Connector",
				method: "setBorderStyle",
				item: connectors,
				borderStyle,
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
				method: "setLineColor",
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

	setStrokeWidth(width: ConnectionLineWidth): void {
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

	setFontSize(size: number | "auto"): void {
		const fontSize = size === "auto" ? size : toFiniteNumber(size);
		const isMultiple = !this.items.isSingle();

		const itemsOps: ItemOp[] = [];
		for (const item of this.items.list()) {
			const text = item.getRichText();
			if (!text) {
				continue;
			}
			const ops = text.setSelectionFontSize(fontSize, this.context);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});
			tempStorage.setFontSize(item.itemType, fontSize);
		}
		this.emitApplied({
			class: "RichText",
			method: "groupEdit",
			itemsOps,
		});
	}

	setFontStyle(fontStyle: TextStyle): void {
		const isMultiple = !this.items.isSingle();

		const itemsOps: ItemOp[] = [];
		for (const item of this.items.list()) {
			const text = item.getRichText();
			if (!text) {
				continue;
			}
			if (isMultiple) {
				text.selectWholeText();
			}
			const ops = text.setSelectionFontStyle(fontStyle, this.context);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});
			tempStorage.setFontStyles(item.itemType, text.getFontStyles());
		}
		this.emitApplied({
			class: "RichText",
			method: "groupEdit",
			itemsOps,
		});
	}

	setFontColor(fontColor: string): void {
		const isMultiple = !this.items.isSingle();
		const itemsOps: ItemOp[] = [];
		for (const item of this.items.list()) {
			const text = item.getRichText();
			if (!text) {
				continue;
			}
			if (isMultiple) {
				text.selectWholeText();
			}
			const ops = text.setSelectionFontColor(fontColor, this.context);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});
			tempStorage.setFontColor(item.itemType, fontColor);
		}
		this.emitApplied({
			class: "RichText",
			method: "groupEdit",
			itemsOps,
		});
	}

	setFontHighlight(fontHighlight: string): void {
		const isMultiple = !this.items.isSingle();

		const itemsOps: ItemOp[] = [];
		for (const item of this.items.list()) {
			const text = item.getRichText();
			if (!text) {
				continue;
			}
			if (isMultiple) {
				text.selectWholeText();
			}
			const ops = text.setSelectionFontHighlight(
				fontHighlight,
				this.context,
			);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});
			tempStorage.setFontHighlight(item.itemType, fontHighlight);
		}
		this.emitApplied({
			class: "RichText",
			method: "groupEdit",
			itemsOps,
		});
	}

	setHorisontalAlignment(horisontalAlignment: HorisontalAlignment): void {
		const isMultiple = !this.items.isSingle();

		const itemsOps: ItemOp[] = [];
		for (const item of this.items.list()) {
			const text = item.getRichText();
			if (!text) {
				continue;
			}
			if (isMultiple) {
				text.selectWholeText();
			}
			const ops = text.setSelectionHorisontalAlignment(
				horisontalAlignment,
				this.context,
			);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});

			tempStorage.setHorizontalAlignment(
				item.itemType,
				horisontalAlignment,
			);
		}
		this.emitApplied({
			class: "RichText",
			method: "groupEdit",
			itemsOps,
		});
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
			if (!item) {
				return;
			}
			const text = item.getRichText();
			if (!text) {
				return;
			}

			tempStorage.setVerticalAlignment(item.itemType, verticalAlignment);
			if (item instanceof RichText) {
				item.setEditorFocus(this.context);
			}
			text.setEditorFocus(this.context);
		}
	}

	removeFromBoard(): void {
		const isLockedFrame = this.items
			.list()
			.some(
				item => item instanceof Frame && item.transformation.isLocked,
			);

		if (isLockedFrame) {
			return;
		}
		this.emit({
			class: "Board",
			method: "remove",
			item: this.items.ids(),
		});
		this.board.tools.getSelect()?.toHighlight.clear();
		this.setContext("None");
	}

	getIsLockedSelection(): boolean {
		const items = this.list();
		const isFrame = items.some(item => item.itemType === "Frame");
		const isFrameLocked = items.some(
			item => item.itemType === "Frame" && item.transformation.isLocked,
		);

		return isFrame && isFrameLocked;
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
		this.setContext("EditUnderPointer");
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

		const selectionColor =
			item.itemType === "Frame" && item.transformation.isLocked
				? SELECTION_LOCKED_COLOR
				: SELECTION_COLOR;
		mbr.borderColor = selectionColor;
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
