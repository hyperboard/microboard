import { Board } from "Board";
import { Events, Operation } from "Board/Events";
import { BoardPoint, ConnectorLineStyle } from "Board/Items/Connector";
import { DrawingContext } from "Board/Items/DrawingContext";
import { FrameType } from "Board/Items/Frame/Basic";
import { TextStyle } from "Board/Items/RichText/Editor/TextNode";
import { DefaultShapeData } from "Board/Items/Shape/ShapeData";
import { Sticker } from "Board/Items/Sticker";
import { Subject } from "shared/Subject";
import { toFiniteNumber } from "Board/lib";
import { conf } from "Board/Settings";
import { Command, createCommand } from "../Events/Command";
import { Connector, Frame, Item, ItemData, Mbr, RichText } from "../Items";
import { HorisontalAlignment, VerticalAlignment } from "../Items/Alignment";
import { BorderStyle } from "../Items/Path";
import { ShapeType } from "../Items/Shape";
import { getQuickAddButtons, QuickAddButtons } from "./QuickAddButtons";
import { SelectionItems } from "./SelectionItems";
import { SelectionTransformer } from "./SelectionTransformer";
import { ConnectorPointerStyle } from "Board/Items/Connector/Pointers/Pointers";
import { TransformManyItems } from "Board/Items/Transformation/TransformationOperations";
import { ItemOp } from "Board/Items/RichText/RichTextOperations";
import { tempStorage } from "App/SessionStorage";
import { Tool } from "Board/Tools/Tool";
import {
	AINode,
	CONTEXT_NODE_HIGHLIGHT_COLOR,
} from "Board/Items/AINode/AINode";
import { BaseRange } from "slate";
import { CONNECTOR_COLOR } from "Board/Items/Connector/Connector";
import { safeRequestAnimationFrame } from "Board/api/safeRequestAnimationFrame";
import { deleteMedia } from "Board/Items/Image/ImageHelpers";
const { i18n } = conf;

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
	shouldRenderItemsMbr = true;

	quickAddButtons: QuickAddButtons;
	showQuickAddPanel = false;

	constructor(
		private board: Board,
		public events?: Events,
	) {
		safeRequestAnimationFrame(this.updateScheduledObservers);
		this.tool = new SelectionTransformer(board, this);
		this.quickAddButtons = getQuickAddButtons(this, board);
	}

	serialize(): string {
		const selectedItems = this.items.list().map(item => item.getId());
		return JSON.stringify(selectedItems);
		this.removeFromBoard();
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
		safeRequestAnimationFrame(this.updateScheduledObservers);
	};

	private itemObserver = (item: Item): void => {
		if (!this.shouldPublish) {
			return;
		}
		// this.quickAddButtons.clear();
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

	addAll(): void {
		const items = this.board.items
			.listAll()
			.filter(item => !item.transformation.isLocked);
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
		this.board.removeVoidComments();
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
		if (this.board.getInterfaceType() !== "edit") {
			return;
		}
		if (this.items.isEmpty()) {
			return;
		}

		this.setContext("EditUnderPointer");

		this.board.tools.select();
	}

	editText(
		shouldReplace?: string,
		moveCursorToEnd = false,
		shouldSelect = false,
	): void {
		if (this.board.getInterfaceType() !== "edit") {
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
			text.editor.clearText();
			text.editor.editor.insertText(shouldReplace);
		}
		if (shouldReplace || moveCursorToEnd) {
			text.editor.moveCursorToEndOfTheText();
		}
		this.setTextToEdit(item);
		this.setContext("EditTextUnderPointer");
		if (shouldSelect) {
			text.editor.selectWholeText();
		}
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
		await text.editor.moveCursorToEndOfTheText(); // prob should be 20 ms
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
				text.editor.selectWholeText();
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
				text.setSelectionFontColor(textColor, "None");
			}
			if (
				textSize &&
				this.context !== "EditUnderPointer" &&
				this.context !== "EditTextUnderPointer"
			) {
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
		text.editor.selectWholeText();
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
			.filter(item => !item.transformation.isLocked);
		const list = this.board.items
			.getEnclosedOrCrossed(rect.left, rect.top, rect.right, rect.bottom)
			.filter(
				item =>
					(!(item instanceof Frame) ||
						enclosedFrames.includes(item)) &&
					!item.transformation.isLocked,
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
		const serializedData = item.serialize(true);
		const zIndex = this.board.items.index.getZIndex(item);
		if (item.itemType === "Comment") {
			return;
		}

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
			const startItemId =
				startPoint.pointType !== "Board"
					? startPoint.item.getId()
					: null;
			const endItemId =
				endPoint.pointType !== "Board" ? endPoint.item.getId() : null;
			const single = this.items.getSingle();
			const frameChild =
				single instanceof Frame ? single.getChildrenIds() : null;

			const hasStartItem =
				startItemId &&
				!this.items.findById(startItemId) &&
				!frameChild?.some(child => child === startItemId);
			const hasEndItem =
				endItemId &&
				!this.items.findById(endItemId) &&
				!frameChild?.some(child => child === endItemId);

			if (hasStartItem) {
				serializedData.startPoint = new BoardPoint(
					startPoint.x,
					startPoint.y,
				).serialize();
			}

			if (hasEndItem) {
				serializedData.endPoint = new BoardPoint(
					endPoint.x,
					endPoint.y,
				).serialize();
			}
		}

		const textItem = item.getRichText()?.getTextString();
		const copyText = i18n.t("frame.copy");
		const isCopyTextExist = textItem?.includes(copyText);
		const isChangeCopiedFrameText =
			item.itemType === "Frame" &&
			serializedData.itemType === "Frame" &&
			textItem !== "" &&
			!isCopyTextExist;

		if (isChangeCopiedFrameText) {
			const copiedFrameText =
				copyText + (textItem || serializedData.text?.placeholderText);
			item.text.editor.clearText();
			item.text.editor.addText(copiedFrameText);
			serializedData.text = item.text.serialize();
			item.text.editor.clearText();
			item.text.editor.addText(textItem || "");
		}
		copiedItemsMap[item.getId()] = { ...serializedData, zIndex };
	}

	copy(skipImageBlobCopy = false):
		| { [key: string]: ItemData }
		| {
				imageElement: HTMLImageElement;
				imageData: { [key: string]: ItemData };
		  } {
		const copiedItemsMap: { [key: string]: ItemData } = {};
		const single = this.items.getSingle();
		if (!skipImageBlobCopy && single && single.itemType === "Image") {
			this.handleItemCopy(single, copiedItemsMap);
			return { imageElement: single.image, imageData: copiedItemsMap };
		}

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
						console.warn(
							`Didn't find item with ${id} while copying`,
						);
					} else {
						this.handleItemCopy(childItem, copiedItemsMap);
					}
				}
			});

		return copiedItemsMap;
	}

	cut(): { [key: string]: ItemData } {
		const items = this.copy();
		this.removeFromBoard();
		return items;
	}

	getText(biggestFontSize = true): RichText | null {
		if (this.items.isEmpty()) {
			return null;
		}
		const items = this.items.list();
		let maxRichText: RichText | null = null;
		let minRichText: RichText | null = null;
		const itemType = items[0].itemType;
		for (const item of items) {
			if (item.itemType !== itemType) {
				return null;
			}
			const richText = item.getRichText();
			if (richText) {
				if (
					!maxRichText ||
					richText.getFontSize() > maxRichText.getFontSize()
				) {
					maxRichText = richText;
				}
				if (
					!minRichText ||
					richText.getFontSize() < minRichText.getFontSize()
				) {
					minRichText = richText;
				}
			}
		}
		return biggestFontSize ? maxRichText : minRichText;
	}

	isTextEmpty(): boolean {
		return this.getText()?.isEmpty() || false;
	}

	getAutosize(): boolean {
		const sticker = this.items.getItemsByItemTypes(["Sticker"])[0];
		return sticker?.text.isAutosize() || false;
	}

	getFontSize(biggest = true): number {
		const fontSize = this.getText(biggest)?.getFontSize() || 14;
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

	nestSelectedItems(unselectedItem?: Item | null, checkFrames = true): void {
		const selected = this.board.selection.items.list();
		if (
			unselectedItem &&
			!selected.find(item => item.getId() === unselectedItem.getId())
		) {
			selected.push(unselectedItem);
		}
		const selectedMbr = selected.reduce((acc: Mbr | undefined, item) => {
			if (!acc) {
				return item.getMbr();
			}
			return acc.combine(item.getMbr());
		}, undefined);

		if (selectedMbr) {
			const selectedMap = Object.fromEntries(
				selected.map(item => [item.getId(), { item, nested: false }]),
			) as { [k: string]: { item: Item; nested: false | Frame } };

			const enclosedFrames = this.board.items.getFramesEnclosedOrCrossed(
				selectedMbr?.left,
				selectedMbr?.top,
				selectedMbr?.right,
				selectedMbr?.bottom,
			);

			enclosedFrames.forEach(frame => {
				selected.forEach(item => {
					if (frame.handleNesting(item)) {
						selectedMap[item.getId()].nested = frame;
					}
				});
			});

			Object.values(selectedMap).forEach(val => {
				const parentFrame = this.board.items.getById(val.item.parent);
				const isParentFrame = parentFrame?.itemType === "Frame";
				const parentFrameId = isParentFrame
					? parentFrame.getId()
					: null;

				if (val.nested) {
					const isRemoveChildFromFrame = Object.values(
						selectedMap,
					).some(
						val =>
							val.nested && val.nested.getId() !== parentFrameId,
					);

					if (isParentFrame && isRemoveChildFromFrame) {
						parentFrame.emitRemoveChild([val.item]);
					}

					val.nested.emitAddChild([val.item]);
				} else if (val.item.parent !== "Board") {
					if (isParentFrame) {
						parentFrame.emitRemoveChild([val.item]);
					} else {
						console.warn(
							`Didnt find frame with id ${val.item.parent}`,
						);
					}
				}

				if (val.item.itemType === "Frame" && checkFrames) {
					const currFrame = val.item;
					const currMbr = currFrame.getMbr();
					const children = val.item
						.getChildrenIds()
						.map(childId => this.board.items.getById(childId))
						.filter(item => !!item);
					const underFrame = this.board.items
						.getEnclosedOrCrossed(
							currMbr.left,
							currMbr.top,
							currMbr.right,
							currMbr.bottom,
						)
						.filter(
							item =>
								item.parent === "Board" ||
								item.parent === currFrame.getId(),
						);
					const uniqueItems = new Set();
					const toCheck = [...children, ...underFrame].filter(
						item => {
							const id = item.getId();
							if (uniqueItems.has(id)) {
								return false;
							}
							uniqueItems.add(id);
							return true;
						},
					);
					// toCheck.forEach(child => currFrame.emitNesting(child));
					currFrame.emitNesting(toCheck);
				}
			});
		}
	}

	// translateBy(x: number, y: number, timeStamp?: number): void {
	// 	this.emit({
	// 		class: "Transformation",
	// 		method: "translateBy",
	// 		item: this.items.ids(),
	// 		x,
	// 		y,
	// 		timeStamp,
	// 	});
	// 	this.off();
	// }
	//
	// scaleBy(x: number, y: number, timeStamp?: number): void {
	// 	this.emit({
	// 		class: "Transformation",
	// 		method: "scaleBy",
	// 		item: this.items.ids(),
	// 		x,
	// 		y,
	// 		timeStamp,
	// 	});
	// }
	//
	// scaleByTranslateBy(
	// 	scale: { x: number; y: number },
	// 	translate: { x: number; y: number },
	// 	timeStamp?: number,
	// ): void {
	// 	this.emit({
	// 		class: "Transformation",
	// 		method: "scaleByTranslateBy",
	// 		item: this.items.ids(),
	// 		scale,
	// 		translate,
	// 		timeStamp,
	// 	});
	// }

	// TODO all the other transformations are redundant, use this one for everything
	// Instead of TransformationOperation just put matrix in it
	/** Emits transformManyItems */
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

	/** transforms selected items with frames' children */
	getManyItemsTranslation(
		x: number,
		y: number,
		unselectedItem?: Item,
	): TransformManyItems {
		const translation: TransformManyItems = {};

		function addItemToTranslation(itemId: string): void {
			translation[itemId] = {
				class: "Transformation",
				method: "scaleByTranslateBy",
				item: [itemId],
				scale: { x: 1, y: 1 },
				translate: { x, y },
			};
		}

		function tryToAddFrameChildrenToTranslation(selectedItem: Item): void {
			if (!(selectedItem instanceof Frame)) {
				return;
			}
			for (const childId of selectedItem.getChildrenIds()) {
				addItemToTranslation(childId);
			}
		}

		const createTranslationWithComments = (item: Item): void => {
			const followedComments = this.board.items
				.getComments()
				.filter(comment => comment.getItemToFollow() === item.getId());
			for (const comment of followedComments) {
				translation[comment.getId()] = {
					class: "Transformation",
					method: "scaleByTranslateBy",
					item: [comment.getId()],
					scale: { x: 1, y: 1 },
					translate: { x, y },
				};
			}
		};

		if (unselectedItem) {
			addItemToTranslation(unselectedItem.getId());
			tryToAddFrameChildrenToTranslation(unselectedItem);
			createTranslationWithComments(unselectedItem);
			return translation;
		}

		for (const selectedItem of this.board.selection.list()) {
			addItemToTranslation(selectedItem.getId());

			tryToAddFrameChildrenToTranslation(selectedItem);

			createTranslationWithComments(selectedItem);
		}

		return translation;
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
		const frames = this.items.getItemsByItemTypes(["Frame"]) as Frame[];
		return frames.every(frame => frame.getCanChangeRatio());
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

		const items = this.items.list();
		items.forEach(item => {
			if (item instanceof Frame) {
				item.setFrameType(frameType);
			}
		});
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
			if (item.itemType === "Sticker" && fontSize === "auto") {
				tempStorage.remove(`fontSize_${item.itemType}`);
			} else if (item.itemType !== "AINode") {
				tempStorage.setFontSize(item.itemType, fontSize);
			}
		}

		// fixes empty sticker unable to change fontsize, needs to be fixed inside of text
		const emptyOps = itemsOps.filter(op => !op.ops.length);
		if (emptyOps.length) {
			const ids = emptyOps.map(op => op.item);
			this.emit({
				class: "RichText",
				method: "setFontSize",
				item: ids,
				fontSize: size,
				context: this.getContext(),
			});
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
				text.editor.selectWholeText();
			}
			const ops = text.setSelectionFontStyle(fontStyle, this.context);
			itemsOps.push({
				item: item.getId(),
				selection: text.editor.getSelection(),
				ops,
			});
			if (item.itemType !== "AINode") {
				tempStorage.setFontStyles(item.itemType, text.getFontStyles());
			}
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
				text.editor.selectWholeText();
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

	setHyperLink(link: string | undefined, selection: BaseRange | null): void {
		const text = this.items.getSingle()?.getRichText();
		if (!text) {
			return;
		}
		const itemsOps: ItemOp[] = [];
		const ops = text.setHyperLink(link, selection);
		itemsOps.push({
			item: text.getId(),
			selection: text.editor.getSelection(),
			ops,
		});

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
				text.editor.selectWholeText();
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
			if (item.itemType !== "AINode") {
				tempStorage.setFontHighlight(item.itemType, fontHighlight);
			}
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
				text.editor.selectWholeText();
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
		const isLocked = this.items
			.list()
			.some(item => item.transformation.isLocked);

		if (isLocked) {
			return;
		}

		const itemIds = this.items.ids();
		for (const comment of this.board.items.getComments()) {
			if (itemIds.includes(comment.getItemToFollow() || "")) {
				itemIds.push(comment.getId());
			}
		}

		const connectors = itemIds
			.flatMap(id => {
				return this.board.items.getLinkedConnectorsById(id);
			})
			.map(connector => connector.getId());

		// connectors.forEach(connector => {
		// 	const startPoint = connector.getStartPoint();
		// 	const endPoint = connector.getEndPoint();
		//
		// 	if (
		// 		(startPoint.pointType === "Fixed" ||
		// 			startPoint.pointType === "FixedConnector") &&
		// 		itemIds.includes(startPoint.item.getId() || "")
		// 	) {
		// 		const { x, y } = startPoint;
		// 		const pointData = new BoardPoint(x, y);
		// 		connector.applyStartPoint(pointData);
		// 	}
		//
		// 	if (
		// 		(endPoint.pointType === "Fixed" ||
		// 			endPoint.pointType === "FixedConnector") &&
		// 		itemIds.includes(endPoint.item.getId() || "")
		// 	) {
		// 		const { x, y } = endPoint;
		// 		const pointData = new BoardPoint(x, y);
		// 		connector.applyEndPoint(pointData);
		// 	}
		// });

		const mediaIds = this.items
			.list()
			.filter(item => {
				const shouldClearStorageUsage =
					item.itemType === "Image" ||
					(item.itemType === "Video" && item.getIsStorageUrl()) ||
					(item.itemType === "Audio" && item.getIsStorageUrl());
				return shouldClearStorageUsage;
			})
			.map(item => item.getStorageId());
		deleteMedia(mediaIds, this.board.getBoardId());

		this.emit({
			class: "Board",
			method: "remove",
			item: Array.from(new Set([...itemIds, ...connectors])),
		});
		this.board.tools.getSelect()?.nestingHighlighter.clear();
		this.setContext("None");
	}

	getIsLockedSelection(): boolean {
		const items = this.list();

		return items.some(item => item.transformation.isLocked);
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
		const filteredItemMap = Object.fromEntries(
			Object.entries(this.copy(true)).filter(
				([_, item]) => item.itemType !== "Group",
			),
		);
		this.board.duplicate(filteredItemMap);
		this.setContext("EditUnderPointer");
	}

	getMostNestedAINodeWithParents(): {
		node: AINode;
		parents: AINode[];
		lastAssistantMessageId: string | undefined;
	} | null {
		const AINodes = this.items.getItemsByItemTypes(["AINode"]);
		if (!AINodes.length) {
			return null;
		}

		let mostNestedNode = AINodes[0];
		let mostNestedNodeParents: AINode[] = [];
		let currentParentsCount = -1;

		AINodes.forEach(node => {
			const parents = this.board.getParentAINodes(node);
			if (parents.length > currentParentsCount) {
				currentParentsCount = parents.length;
				mostNestedNode = node;
				mostNestedNodeParents = parents;
			}
		});

		let lastAssistantMessageId: string | undefined;
		const nodes = [...mostNestedNodeParents, mostNestedNode];
		for (let i = nodes.length - 1; i >= 0; i--) {
			if (!nodes[i].getIsUserRequest()) {
				lastAssistantMessageId = nodes[i].getId();
				break;
			}
		}

		return {
			node: mostNestedNode,
			parents: mostNestedNodeParents,
			lastAssistantMessageId,
		};
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

		const selectionColor = item.transformation.isLocked
			? conf.SELECTION_LOCKED_COLOR
			: conf.SELECTION_COLOR;
		mbr.borderColor = selectionColor;
		mbr.render(context);
	}

	render(context: DrawingContext): void {
		const single = this.items.getSingle();
		const isSingleConnector = single && single.itemType === "Connector";
		const isLocked = single && single.transformation.isLocked;

		if (isSingleConnector) {
			if (!isLocked) {
				this.tool.render(context);
			}
			return;
		}

		if (!this.transformationRenderBlock) {
			if (this.shouldRenderItemsMbr) {
				for (const item of this.items.list()) {
					this.renderItemMbr(context, item);
				}
			}
			this.tool.render(context);
			if (!isLocked) {
				this.quickAddButtons.render(context);
			}
		}

		const contextItems: Item[] = [];
		if (single && single.itemType === "AINode") {
			const contextItemsIds = single.getContextItems();
			if (contextItemsIds.length) {
				const newContextItems = this.board.items
					.listAll()
					.filter(item => contextItemsIds.includes(item.getId()));
				contextItems.push(...newContextItems);
			}
		}

		const nodeWithParents = this.getMostNestedAINodeWithParents();
		if (nodeWithParents) {
			const contextRange = nodeWithParents.node.getContextRange();
			const parents = nodeWithParents.parents;
			let assistantMessagesCount = 0;
			for (
				let i = 0;
				assistantMessagesCount < contextRange && i < parents.length;
				i++
			) {
				if (parents[i].getIsUserRequest()) {
					contextItems.push(parents[i]);
				} else {
					contextItems.push(parents[i]);
					assistantMessagesCount++;
				}
			}
		}

		contextItems.forEach(item => {
			if (item.itemType === "AINode") {
				const path = item.getPath();
				path.setBorderColor(CONTEXT_NODE_HIGHLIGHT_COLOR);
				path.setBorderWidth(2);
				path.setBackgroundColor("none");
				path.render(context);
			} else {
				const itemRect = item.getMbr();
				itemRect.borderColor = CONTEXT_NODE_HIGHLIGHT_COLOR;
				itemRect.strokeWidth = 2;
				itemRect.render(context);
			}
		});
	}
}
