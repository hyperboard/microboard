import { MoveItem } from "Geometry/Transformation/TransformationOperations";
import { transformOps } from "Geometry/Transformation/transformOps";
import { safeRequestAnimationFrame } from "api/safeRequestAnimationFrame";
import { Board } from "Board";
import { Events, Operation, Command, BaseOperation } from "Events";
import { createCommand } from "Events/CreateCommand";
import { BoardPoint } from "Items/Connector/ControlPoint";
import type { Connector } from "Items/Connector/Connector";
import type { Item, ItemData, ItemDataWithId } from "Items/Item";
import { Point } from "Geometry/Point/Point";
import type { BaseItem } from "Items/BaseItem/BaseItem";
import type { Frame } from "Items/Frame/Frame";
import type { ImageItem } from "Items/Image/Image";
import type { RichText } from "Items/RichText/RichText";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Shape } from "Items/Shape";
import { propertyOps } from "Items/propertyOps";
import { Drawing } from "Items/Drawing";
import { Sticker, connectorOps } from "Items";
import type { FrameData } from "Items/Frame/FrameData";
import { AINode, CONTEXT_NODE_HIGHLIGHT_COLOR } from "Items/AINode/AINode";
import { HorisontalAlignment, VerticalAlignment } from "Geometry/Alignment";
import { ColorValue, coerceColorValue } from "Color";
import { ConnectorLineStyle } from "Items/Connector/ConnectorTypes";
import { CONNECTOR_COLOR } from "../Items/Connector/ConnectorTypes";
import { ConnectionLineWidth } from "Items/Connector/ConnectorTypes";
import { ConnectorPointerStyle } from "Items/Connector/Pointers/Pointers";
import { DrawingContext } from "Geometry/DrawingContext";
import { FrameType } from "Items/Frame/Basic";
import { BorderStyle, BorderWidth } from "Geometry/Path/Path";
import { TextStyle } from "Items/RichText/Editor/TextNode";
import { ItemOp } from "Items/RichText/RichTextOperations";
import { DefaultShapeData } from "Items/Shape/ShapeData";
import { ShapeType } from "Items/Shape/ShapeType";
import { ApplyMatrixItem } from "Geometry/Transformation/TransformationOperations";
import { toFiniteNumber } from "lib";
import { conf } from "Settings";
import { Subject } from "Subject";
import { Tool } from "Tools/Tool";
import { QuickAddButtons, getQuickAddButtons } from "./QuickAddButtons";
import { SelectionItems } from "./SelectionItems";
import { SelectionTransformer } from "./SelectionTransformer";
import { BaseSelection, BaseRange } from "slate";
import { ReactEditor } from "slate-react";
import { tempStorage } from "SessionStorage";
import { Group } from "Items/Group";
import { Deck } from "Items/Deck/Deck";
import { Card } from "Items/Card/Card";

const defaultShapeData = new DefaultShapeData();

export type SelectionContext =
  | "SelectUnderPointer"
  | "HoverUnderPointer"
  | "EditUnderPointer"
  | "EditTextUnderPointer"
  | "SelectByRect"
  | "None";

type SelectionSnapshot = {
  selectedItems: string;
  context: SelectionContext;
  focus: {
    selection: BaseSelection;
    textToEdit: string;
  } | null;
};

export type SelectionHierarchyNode = {
  id: string;
  itemType: string;
  parentId: string | null;
  hasChildren: boolean;
  isCanvasSelectable: boolean;
};

export class BoardSelection {
  readonly subject = new Subject<BoardSelection>();
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

  memorySnapshot: SelectionSnapshot | null = null;

  constructor(private board: Board) {
    safeRequestAnimationFrame(this.updateScheduledObservers);
    this.tool = new SelectionTransformer(board, this);
    this.quickAddButtons = getQuickAddButtons(this, board);
  }

  serialize(): string {
    const selectedItems = this.items.list().map((item) => item.getId());
    return JSON.stringify(selectedItems);
  }

  deserialize(serializedData: string): void {
    const selectedItems: string[] = JSON.parse(serializedData);
    this.removeAll();
    selectedItems.forEach((itemId) => {
      const item = this.board.items.getById(itemId);
      if (item) {
        this.add(item);
      }
    });
  }

  private getEditingFocus() {
    if (!this.textToEdit) {
      return null;
    }

    return {
      textToEdit: this.textToEdit.getId(),
      selection: this.textToEdit.editor.getSelection(),
    };
  }

  memoize(): SelectionSnapshot {
    const focus = this.getEditingFocus();
    const snapshot = {
      selectedItems: this.serialize(),
      context: this.context,
      focus,
    };
    this.memorySnapshot = snapshot;
    return snapshot;
  }

  applyMemoized(): SelectionSnapshot | null {
    const savedData = this.memorySnapshot ? { ...this.memorySnapshot } : null;
    if (savedData) {
      this.deserialize(savedData.selectedItems);
      this.setContext(savedData.context);
      const focusedText = this.board.items
        .getById(savedData.focus?.textToEdit || "")
        ?.getRichText();
      if (savedData.focus && focusedText) {
        this.setTextToEdit(focusedText);
        focusedText.editorTransforms.select(
          focusedText.editor.editor,
          savedData.focus.selection || []
        );
        ReactEditor.focus(focusedText.editor.editor);
      }
    }

    return savedData;
  }

  applyMemoizedCaretOrRange(): void {
    const focusedText = this.board.items
      .getById(this.memorySnapshot?.focus?.textToEdit || "")
      ?.getRichText();
    if (this.memorySnapshot?.focus && focusedText) {
      focusedText.editorTransforms.select(
        focusedText.editor.editor,
        this.memorySnapshot?.focus.selection || []
      );
      ReactEditor.focus(focusedText.editor.editor);
    }
  }

  private emit(operation: Operation): void {
    if (!this.board.events) {
      return;
    }
    const command = createCommand(this.board, operation);
    command.apply();
    this.board.events.emit(operation, command);
  }

  private emitApplied(operation: Operation): void {
    this.emitCommand(operation);
  }

  private emitCommand(operation: Operation): Command | null {
    if (!this.board.events) {
      return null;
    }
    const command = createCommand(this.board, operation);
    this.board.events.emit(operation, command);
    return command;
  }

  updateQueue: Set<() => void> = new Set();

  decorateObserverToScheduleUpdate<T extends (...args: never[]) => void>(
    observer: T
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
    this.itemObserver
  );

  add(value: Item | Item[]): void {
    const values = Array.isArray(value) ? value : [value];
    const nextItems = this.normalizeSelectionItems([
      ...this.items.list(),
      ...values,
    ]);
    const currentIds = new Set(this.items.ids());
    const nextIds = new Set(nextItems.map((item) => item.getId()));

    const removed = this.items.list().filter((item) => !nextIds.has(item.getId()));
    const added = nextItems.filter((item) => !currentIds.has(item.getId()));

    if (removed.length > 0) {
      this.items.remove(removed);
      removed.forEach((item) => item.subject.unsubscribe(this.itemObserver));
    }
    if (added.length > 0) {
      this.items.add(added);
      added.forEach((item) => item.subject.subscribe(this.itemObserver));
    }

    this.subject.publish(this);
    this.itemsSubject.publish([]);
  }

  addAll(): void {
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
    if (single?.itemType === "RichText" && (single as RichText).isEmpty()) {
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

  getSelectableItem(item: Item | null | undefined): Item | null {
    if (!item) {
      return null;
    }
    if (item.itemType === "RichText") {
      const owner = this.board.items.getById(item.getId());
      if (owner && owner !== item) {
        return owner;
      }
    }
    if (item.itemType === "Group") {
      return null;
    }
    return item;
  }

  private getParentItem(item: Item | string | null | undefined): BaseItem | null {
    const resolved =
      typeof item === "string" ? this.board.items.getById(item) : item || null;
    if (!resolved || !('itemType' in resolved) || resolved.parent === "Board") {
      return null;
    }
    return (this.board.items.getById(resolved.parent) as BaseItem | undefined) || null;
  }

  private isAncestor(candidate: Item, descendant: Item): boolean {
    if (!('itemType' in descendant)) {
      return false;
    }

    let parentId = descendant.parent;
    while (parentId && parentId !== "Board") {
      if (parentId === candidate.getId()) {
        return true;
      }
      const parent = this.board.items.getById(parentId) as BaseItem | undefined;
      if (!parent || parent.parent === parentId) {
        return false;
      }
      parentId = parent.parent;
    }

    return false;
  }

  private normalizeSelectionItems(items: Item[]): Item[] {
    const normalized: Item[] = [];

    for (const item of items) {
      const alreadyCovered = normalized.some(
        (selected) =>
          selected.getId() === item.getId() || this.isAncestor(selected, item)
      );
      if (alreadyCovered) {
        continue;
      }

      for (let i = normalized.length - 1; i >= 0; i -= 1) {
        if (this.isAncestor(item, normalized[i])) {
          normalized.splice(i, 1);
        }
      }

      normalized.push(item);
    }

    return normalized;
  }

  private getCanvasSelectableItems(items: Item[]): Item[] {
    return items.filter((item) => item.itemType !== "Group");
  }

  selectUnderPointer(): void {
    this.removeAll();
    const stack = this.board.items.getUnderPointer();
    const top = this.getSelectableItem(stack.pop());
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
    shouldSelect = false
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

  editUnderPointer(): void {
    this.removeAll();
    const stack = this.board.items.getUnderPointer();
    const item = this.getSelectableItem(stack.pop());
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
    const text = item?.getRichText();

    if (this.textToEdit && this.textToEdit !== text) {
      this.textToEdit.updateElement();
      this.textToEdit.enableRender();
    }

    if (!text) {
      this.textToEdit = undefined;
      return;
    }

    if (this.textToEdit === text) {
      return; // Already editing this item. Avoid flickering.
    }

    this.textToEdit = text;

    if (text.isEmpty()) {
      const textColor = tempStorage.getFontColor(item!.itemType);
      const textSize = tempStorage.getFontSize(item!.itemType);
      const highlightColor = tempStorage.getFontHighlight(item!.itemType);
      const styles = tempStorage.getFontStyles(item!.itemType);
      const horisontalAlignment = tempStorage.getHorisontalAlignment(
        item!.itemType
      );
      const verticalAlignment = tempStorage.getVerticalAlignment(item!.itemType);
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
          item: [item!.getId()],
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
      if (horisontalAlignment && item?.itemType !== "Sticker") {
        text.setSelectionHorisontalAlignment(horisontalAlignment);
      }
      if (verticalAlignment && item?.itemType !== "Sticker") {
        this.setVerticalAlignment(verticalAlignment);
      }
    }
    text.editor.selectWholeText();
    this.textToEdit.disableRender();
    this.board.items.subject.publish(this.board.items);
  }

  editTextUnderPointer(): void {
    this.removeAll();
    const stack = this.board.items.getUnderPointer();
    const top = this.getSelectableItem(stack.pop());
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
    const list = this.getCanvasSelectableItems(
      this.board.items.getEnclosed(rect.left, rect.top, rect.right, rect.bottom)
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
    const enclosedFrames = this.board.items.getEnclosed(
      rect.left,
      rect.top,
      rect.right,
      rect.bottom
    );
    const list = this.getCanvasSelectableItems(
      this.board.items
        .getEnclosedOrCrossed(rect.left, rect.top, rect.right, rect.bottom)
        .filter(
          (item) => item.itemType !== "Frame" || enclosedFrames.includes(item)
        )
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
      this.items.isSingle() && this.items.getSingle()?.getRichText()
    );
  }

  private handleItemCopy(
    item: Item,
    copiedItemsMap: { [key: string]: ItemData }
  ): void {
    const serializedData = item.serialize() as ItemData;
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
        startPoint.pointType !== "Board" ? startPoint.item.getId() : null;
      const endItemId =
        endPoint.pointType !== "Board" ? endPoint.item.getId() : null;
      const single = this.items.getSingle();
      const frameChild =
        single && "index" in single && single.index ? (single as BaseItem).getChildrenIds() : null;

      const hasStartItem =
        startItemId &&
        !this.items.findById(startItemId) &&
        !frameChild?.some((child: string) => child === startItemId);
      const hasEndItem =
        endItemId &&
        !this.items.findById(endItemId) &&
        !frameChild?.some((child: string) => child === endItemId);

      if (hasStartItem) {
        serializedData.startPoint = new BoardPoint(
          startPoint.x,
          startPoint.y
        ).serialize();
      }

      if (hasEndItem) {
        serializedData.endPoint = new BoardPoint(
          endPoint.x,
          endPoint.y
        ).serialize();
      }
    }

    const textItem = item.getRichText()?.getTextString();
    const copyText = conf.i18n.t("frame.copy");
    const isCopyTextExist = textItem?.includes(copyText);
    const isChangeCopiedFrameText =
      item.itemType === "Frame" &&
      serializedData.itemType === "Frame" &&
      textItem !== "" &&
      !isCopyTextExist;

    if (isChangeCopiedFrameText) {
      const frameData = serializedData as FrameData;
      const textItemData = frameData.text;
      const copiedFrameText =
        copyText + (textItem || (textItemData?.placeholderText as string | undefined) || "");
      item.getRichText()?.editor.clearText();
      item.getRichText()?.editor.addText(copiedFrameText);
      frameData.text = item.getRichText()?.serialize();
      item.getRichText()?.editor.clearText();
      item.getRichText()?.editor.addText(textItem || "");
    }
    copiedItemsMap[item.getId()] = { ...serializedData, zIndex };
  }

  copy(skipImageBlobCopy: true): { [key: string]: ItemData };
  copy(skipImageBlobCopy?: false): { imageElement: HTMLImageElement; imageData: { [key: string]: ItemData } };
  copy(skipImageBlobCopy?: boolean):
    | { [key: string]: ItemData }
    | {
      imageElement: HTMLImageElement;
      imageData: { [key: string]: ItemData };
    } {
    const copiedItemsMap: { [key: string]: ItemData } = {};
    const single = this.items.getSingle();
    if (!skipImageBlobCopy && single?.itemType === "Image") {
      const imageItem = single as ImageItem;
      this.handleItemCopy(imageItem, copiedItemsMap);
      return { imageElement: imageItem.image, imageData: copiedItemsMap };
    }

    this.list().forEach((item) => {
      this.handleItemCopy(item, copiedItemsMap);
    });

    this.list()
      .flatMap((item) => {
        if ("index" in item && item.index) {
          return item.getChildrenIds();
        }
        return [];
      })
      .filter((id): id is string => id !== null)
      .forEach((id) => {
        if (!(id in copiedItemsMap)) {
          const childItem = this.board.items.getById(id!);
          if (!childItem) {
            console.warn(`Didn't find item with ${id} while copying`);
          } else {
            this.handleItemCopy(childItem, copiedItemsMap);
          }
        }
      });

    return copiedItemsMap;
  }

  cut(): { [key: string]: ItemData } {
    const items = this.copy(true);
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
    const sticker = this.items.getItemsByItemTypes(["Sticker"])[0] as Sticker;
    return sticker?.text.isAutosize() || false;
  }

  getFontSize(biggest = true): number {
    const fontSize = this.getText(biggest)?.getFontSize() || 14;
    return Math.round(fontSize);
  }

  getFontHighlight(): ColorValue | string {
    const color = this.getText()?.getFontHighlight() || "none";
    return color;
  }

  getFontColor(): ColorValue | string {
    const color = this.getText()?.getFontColor() || "none";
    return color;
  }

  getFillColor(): ColorValue | string {
    const tmp = this.items.list()[0];
    if (tmp.itemType === "Shape") {
      return (tmp as Shape).getBackgroundColor();
    }
    return defaultShapeData.backgroundColor;
  }

  getBorderStyle(): string {
    const shape = this.items.list()[0];
    return "getBorderStyle" in shape ? shape.getBorderStyle() : defaultShapeData.borderStyle;
  }

  getStrokeColor(): ColorValue | string {
    const shape = this.items.list()[0];
    if (shape.itemType === "Shape" || shape.itemType === "Drawing") {
      return (shape as Shape | Drawing).getStrokeColor();
    }
    return defaultShapeData.borderColor;
  }

  getStrokeWidth(): BorderWidth {
    const item = this.items.list()[0];
    if (item instanceof Shape || item instanceof Drawing) {
      return item.getStrokeWidth();
    }
    return 1 as BorderWidth;
  }

  getConnectorLineWidth(): number {
    const connector = this.items.getItemsByItemTypes(["Connector"])[0] as Connector;
    return connector?.getLineWidth() || 1;
  }

  getConnectorLineColor(): ColorValue | string {
    const connector = this.items.getItemsByItemTypes(["Connector"])[0] as Connector;
    return connector?.getLineColor() || CONNECTOR_COLOR;
  }

  getStartPointerStyle(): ConnectorPointerStyle {
    const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as Connector;
    return pointer?.getStartPointerStyle() || "None";
  }

  getEndPointerStyle(): ConnectorPointerStyle {
    const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as Connector;
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
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(connectorOps.switchPointers(items));
    }
  }

  setConnectorLineStyle(style: ConnectorLineStyle): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "lineStyle", style));
    }
  }

  setConnectorStartPointerStyle(style: ConnectorPointerStyle): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "startPointerStyle", style));
    }
  }

  setConnectorEndPointerStyle(style: ConnectorPointerStyle): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "endPointerStyle", style));
    }
  }

  setConnectorLineColor(color: ColorValue): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "lineColor", color));
    }
  }

  setConnectorLineWidth(width: ConnectionLineWidth): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "lineWidth", width));
    }
  }

  setConnectorBorderStyle(style: BorderStyle): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "borderStyle", style));
    }
  }

  setConnectorSmartJump(value: boolean): void {
    const items = this.items.list().filter((i): i is Connector => i.itemType === "Connector");
    if (items.length > 0) {
      this.emit(propertyOps.setProperty(items, "smartJump", value));
    }
  }

  createDeck(): void {
    const single = this.items.getSingle();
    if (single?.itemType === "Deck") {
      return;
    }

    const selected = this.items.listAll();
    const onlyCards = this.items.isAllItemsType("Card");

    if (onlyCards) {
      const anchor = selected[selected.length - 1] as BaseItem | undefined;
      if (!anchor) {
        return;
      }

      const deck = new Deck(this.board, "");
      deck.apply(transformOps.setLocal(deck.id, {
        translateX: anchor.getMbr().left,
        translateY: anchor.getMbr().top,
      }));
      const addedDeck = this.board.add(deck);
      this.removeAll();
      addedDeck.addChildItems(selected);
      this.add(addedDeck);
      return;
    }

    let mainDeck: Deck | null = null;
    const cards: Card[] = [];
    selected.forEach(item => {
      if (item.itemType === "Card") {
        cards.push(item as Card);
      } else if (item.itemType === "Deck") {
        const deck = item as Deck;
        if (mainDeck) {
          cards.push(...deck.getDeck());
          this.board.remove(deck);
        } else {
          mainDeck = deck;
        }
      }
    });

    this.removeAll();
    if (mainDeck) {
      const targetDeck = mainDeck as Deck;
      targetDeck.addChildItems(cards);
      this.add(targetDeck);
    }
  }

  getConnectorLineStyle(): string {
    const pointer = this.items.getItemsByItemTypes(["Connector"])[0] as Connector;
    return pointer?.getLineStyle() || "none";
  }

  getTextToEdit(): RichText | undefined {
    if (this.context !== "EditTextUnderPointer") {
      return undefined;
    }
    return this.textToEdit;
  }

  getParent(item: Item | string | null | undefined): BaseItem | null {
    return this.getParentItem(item);
  }

  getParentChain(item: Item | string | null | undefined): BaseItem[] {
    const chain: BaseItem[] = [];
    let parent = this.getParentItem(item);

    while (parent) {
      chain.push(parent);
      parent = this.getParentItem(parent);
    }

    return chain;
  }

  getHierarchyPath(item: Item | string | null | undefined): SelectionHierarchyNode[] {
    const resolved =
      typeof item === "string" ? this.board.items.getById(item) : item || null;
    if (!resolved) {
      return [];
    }

    const nodes = [...this.getParentChain(resolved).reverse(), resolved];
    return nodes
      .filter((node): node is BaseItem => 'itemType' in node)
      .map((node) => ({
        id: node.getId(),
        itemType: node.itemType,
        parentId: node.parent === "Board" ? null : node.parent,
        hasChildren: (node.getChildrenIds()?.length || 0) > 0,
        isCanvasSelectable: node.itemType !== "Group",
      }));
  }

  getSelectionHierarchyPaths(): SelectionHierarchyNode[][] {
    return this.items.list().map((item) => this.getHierarchyPath(item));
  }

  getCommonParent(): BaseItem | null {
    const selected = this.items.list();
    if (selected.length === 0) {
      return null;
    }

    const firstParent = this.getParentItem(selected[0]);
    if (!firstParent) {
      return null;
    }

    const firstParentId = firstParent.getId();
    const hasSameParent = selected.every(
      (item) => this.getParentItem(item)?.getId() === firstParentId
    );

    return hasSameParent ? firstParent : null;
  }

  canPromoteSelectionToParent(): boolean {
    return this.getCommonParent() !== null;
  }

  selectParent(): BaseItem | null {
    const parent = this.getCommonParent();
    if (!parent) {
      return null;
    }

    this.removeAll();
    this.add(parent);
    this.setContext("SelectUnderPointer");
    return parent;
  }

  selectAncestorById(ancestorId: string): BaseItem | null {
    const selected = this.items.list();
    if (selected.length === 0) {
      return null;
    }

    const ancestor = this.board.items.getById(ancestorId);
    if (!ancestor || !('itemType' in ancestor)) {
      return null;
    }

    const isSharedAncestor = selected.every(
      (item) => item.getId() === ancestorId || this.isAncestor(ancestor, item)
    );
    if (!isSharedAncestor) {
      return null;
    }

    this.removeAll();
    this.add(ancestor);
    this.setContext("SelectUnderPointer");
    return ancestor;
  }

  nestSelectedItems(unselectedItem?: Item | null, checkFrames = true): void {
    const selected = this.board.selection.items.list();
    if (
      unselectedItem &&
      !selected.find((item) => item.getId() === unselectedItem.getId())
    ) {
      selected.push(unselectedItem);
    }
    const selectedMbr = selected.reduce((acc: Mbr | undefined, item) => {
      if (!acc) {
        return (item as BaseItem).getWorldMbr();
      }
      return acc.combine((item as BaseItem).getWorldMbr());
    }, undefined);

    if (selectedMbr) {
      const selectedMap = Object.fromEntries(
        selected.map((item) => [item.getId(), { item, nested: false }])
      ) as { [k: string]: { item: BaseItem; nested: false | BaseItem } };

      const enclosedGroups = this.board.items.getGroupItemsEnclosedOrCrossed(
        selectedMbr?.left,
        selectedMbr?.top,
        selectedMbr?.right,
        selectedMbr?.bottom
      );

      enclosedGroups.forEach((group) => {
        selected.forEach((item) => {
          if (group.handleNesting(item)) {
            selectedMap[item.getId()].nested = group;
          }
        });
      });

      // Fallback: if the spatial index had stale bounds and didn't return the
      // item's current parent group, check it directly. This prevents accidental
      // detachment when a child is dragged within its group after the group moved.
      selected.forEach((item) => {
        const entry = selectedMap[item.getId()];
        if (!entry.nested && item.parent !== "Board") {
          const currentParent = this.board.items.getById(item.parent) as BaseItem | undefined;
          if (currentParent?.index && currentParent.handleNesting(item)) {
            entry.nested = currentParent;
          }
        }
      });

      Object.values(selectedMap).forEach((val) => {
        const parentGroup = this.board.items.getById(val.item.parent);
        const parentGroupId = parentGroup?.getId();

        if (val.nested) {
          const isRemoveChildFromFrame = Object.values(selectedMap).some(
            (val) => val.nested && val.nested.getId() !== parentGroupId
          );

          if (parentGroupId && isRemoveChildFromFrame) {
            parentGroup?.removeChildItems([val.item]);
          }

          val.nested.addChildItems([val.item]);
        } else if (val.item.parent !== "Board") {
          if (parentGroupId) {
            parentGroup?.removeChildItems([val.item]);
          } else {
            console.warn(`Didnt find frame with id ${val.item.parent}`);
          }
        }

        if (checkFrames) {
          const childrenIds = val.item.getChildrenIds();
          if (childrenIds) {
            const currGroup = val.item;
            const currMbr = currGroup.getWorldMbr();
            const children = childrenIds
              .map((childId) => this.board.items.getById(childId))
              .filter((item) => !!item);
            const underGroup = this.board.items
              .getEnclosedOrCrossed(
                currMbr.left,
                currMbr.top,
                currMbr.right,
                currMbr.bottom
              )
              .filter(
                (item) =>
                  item.parent === "Board" || item.parent === currGroup.getId()
              );
            const uniqueItems = new Set();
            const toCheck = [...children, ...underGroup].filter((item) => {
              const id = item.getId();
              if (uniqueItems.has(id)) {
                return false;
              }
              uniqueItems.add(id);
              return true;
            });
            // toCheck.forEach(child => currFrame.emitNesting(child));
            currGroup.emitNesting(toCheck);
          }
        }
      });
    }
  }

  /** transforms selected items (container children follow via local transform hierarchy) */
  moveMany(items: MoveItem[], timeStamp?: number): void {
    this.shouldPublish = false;
    this.emit(transformOps.move(items, timeStamp));
    this.shouldPublish = true;
  }

  /** transforms selected items (container children follow via local transform hierarchy) */
  getManyItemsMove(
    x: number,
    y: number,
    unselectedItem?: Item
  ): MoveItem[] {
    const items: MoveItem[] = [];

    const addItem = (item: BaseItem): void => {
      const worldMatrix = item.getWorldMatrix();
      const newWorld = worldMatrix.copy();
      newWorld.translateX += x;
      newWorld.translateY += y;
      items.push({
        id: item.getId(),
        worldMatrix: newWorld.getMatrixData(),
        prevWorldMatrix: worldMatrix.getMatrixData(),
      });
    };

    // Build a set of selected IDs so we can detect when a child's container is
    // also selected. In that case the child follows the container via the local
    // transform hierarchy and must NOT receive its own explicit translate op
    // (doing so would move it twice).
    const selectedIds = new Set(
      unselectedItem
        ? [unselectedItem.getId()]
        : this.board.selection.list().map((i) => i.getId())
    );

    const addWithComments = (item: Item): void => {
      // If this item lives inside a container that is also being moved, skip it —
      // it will follow its container automatically.
      if (item.parent !== "Board" && selectedIds.has(item.parent)) {
        return;
      }
      addItem(item as BaseItem);
      const followedComments = this.board.items
        .getComments()
        .filter((comment) => comment.getItemToFollow() === item.getId());
      for (const comment of followedComments) {
        addItem(comment as BaseItem);
      }
    };

    if (unselectedItem) {
      addWithComments(unselectedItem);
      return items;
    }

    for (const selectedItem of this.board.selection.list()) {
      addWithComments(selectedItem);
    }

    return items;
  }

  setStrokeStyle(borderStyle: BorderStyle): void {
    const operations: Record<string, Operation> = {};
    this.items.list().forEach((item) => {
      if (item.itemType === "Shape") {
        const shape = item as Shape;
        if (!operations["Shape"]) operations["Shape"] = propertyOps.setProperty([shape], "borderStyle", borderStyle);
        else (operations["Shape"] as any).item.push(item.getId());
      } else if (item.itemType === "Drawing") {
        if (!operations["Drawing"]) operations["Drawing"] = propertyOps.setProperty([item], "borderStyle", borderStyle);
        else (operations["Drawing"] as any).item.push(item.getId());
      } else if (item.itemType === "Connector") {
        if (!operations["Connector"]) operations["Connector"] = { class: "Connector", method: "setBorderStyle", item: [item.getId()], borderStyle };
        else (operations["Connector"] as any).item.push(item.getId());
      }
    });
    Object.values(operations).forEach((op) => this.emit(op));
  }

  setStrokeColor(borderColor: string): void {
    const color = coerceColorValue(borderColor);
    const operations: Record<string, Operation> = {};
    this.items.list().forEach((item) => {
      if (item.itemType === "Shape") {
        const shape = item as Shape;
        if (!operations["Shape"]) operations["Shape"] = propertyOps.setProperty([shape], "borderColor", color);
        else (operations["Shape"] as any).item.push(item.getId());
      } else if (item.itemType === "Drawing") {
        if (!operations["Drawing"]) operations["Drawing"] = propertyOps.setProperty([item], "borderColor", color);
        else (operations["Drawing"] as any).item.push(item.getId());
      } else if (item.itemType === "Connector") {
        if (!operations["Connector"]) operations["Connector"] = propertyOps.setProperty([item], "lineColor", color);
        else (operations["Connector"] as any).item.push(item.getId());
      }
    });
    Object.values(operations).forEach((op) => this.emit(op));
  }

  setStrokeWidth(width: BorderWidth): void {
    const operations: Record<string, Operation> = {};
    this.items.list().forEach((item) => {
      if (item.itemType === "Shape") {
        const shape = item as Shape;
        if (!operations["Shape"]) operations["Shape"] = propertyOps.setProperty([shape], "borderWidth", width);
        else (operations["Shape"] as any).item.push(item.getId());
      } else if (item.itemType === "Drawing") {
        if (!operations["Drawing"]) operations["Drawing"] = propertyOps.setProperty([item], "strokeWidth", width);
        else (operations["Drawing"] as any).item.push(item.getId());
      } else if (item.itemType === "Connector") {
        if (!operations["Connector"]) operations["Connector"] = propertyOps.setProperty([item], "lineWidth", width as ConnectionLineWidth);
        else (operations["Connector"] as any).item.push(item.getId());
      }
    });
    Object.values(operations).forEach((op) => this.emit(op));
  }

  setFillColor(backgroundColor: string): void {
    const color = coerceColorValue(backgroundColor);
    const operations: Record<string, Operation> = {};

    this.items.list().forEach((item) => {
      if (item.itemType === "Shape") {
        const shape = item as Shape;
        if (!operations["Shape"]) {
          operations["Shape"] = propertyOps.setProperty([shape], "backgroundColor", color);
        } else {
          (operations["Shape"] as any).item.push(shape.getId());
        }
      } else if (item.itemType === "Sticker") {
        const sticker = item as Sticker;
        if (!operations["Sticker"]) {
          operations["Sticker"] = propertyOps.setProperty([sticker], "backgroundColor", color);
        } else {
          (operations["Sticker"] as any).item.push(sticker.getId());
        }
      } else if (item.itemType === "RichText") {
        if (!operations["RichText"]) {
          operations["RichText"] = {
            class: "RichText",
            method: "setBackgroundColor",
            item: [item.getId()],
            backgroundColor: color,
          } as any;
        } else {
          (operations["RichText"] as any).item.push(item.getId());
        }
      }
    });

    Object.values(operations).forEach((op) => {
      this.emit(op);
    });
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
    return frames.every((frame) => frame.getCanChangeRatio());
  }

  setFrameType(frameType: FrameType): void {
    const items = this.items.list();
    items.forEach((item) => {
      if (item.itemType === "Frame") {
        (item as Frame).setFrameType(frameType);
      }
    });
  }

  getFrameType(): FrameType {
    const frame = this.items.getItemsByItemTypes(["Frame"])[0] as Frame;
    return frame ? (frame as Frame).getFrameType() : "Custom";
  }

  setShapeType(shapeType: ShapeType): void {
    const shapes = this.items.getItemsByItemTypes(["Shape"]) as Shape[];
    if (shapes.length > 0) {
      this.emit(propertyOps.setProperty(shapes, "shapeType", shapeType));
    }
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
    const emptyOps = itemsOps.filter((op) => !op.ops.length);
    if (emptyOps.length) {
      const ids = emptyOps.map((op) => op.item);
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
      const ops = text.setSelectionFontHighlight(fontHighlight, this.context);
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
        this.context
      );
      itemsOps.push({
        item: item.getId(),
        selection: text.editor.getSelection(),
        ops,
      });

      tempStorage.setHorisontalAlignment(item.itemType, horisontalAlignment);
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

      tempStorage.setVerticalAlignment(item.itemType, verticalAlignment || "top");
      if (item.itemType === "RichText") {
        (item as RichText).setEditorFocus(this.context);
      }
      text.setEditorFocus(this.context);
    }
  }

  removeFromBoard(): void {
    const isLocked = this.items
      .list()
      .some((item) => item.transformation.isLocked);

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
      .flatMap((id) => {
        return this.board.items.getLinkedConnectorsById(id);
      })
      .map((connector) => connector.getId());

    this.emit({
      class: "Board",
      method: "remove",
      item: Array.from(new Set([...itemIds, ...connectors])),
    });
    this.board.tools.getSelect()?.nestingHighlighter.clear();
    this.setContext("None");
  }

  getIsResizeEnabled(): boolean {
    const items = this.list();

    return !items.some((item) => !item.resizeEnabled);
  }

  getIsLockedSelection(): boolean {
    const items = this.list();

    return items.some((item) => item.transformation.isLocked);
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

  async duplicate(): Promise<void> {
    const mediaIds: string[] = []
    this.items.list().forEach((item) => {
      if ("getStorageId" in item) {
        const storageId = item.getStorageId();
        if (storageId) {
          mediaIds.push(storageId);
        }
      }
    });
    const canDuplicate = mediaIds.length
      ? await conf.hooks.beforeMediaUpload(mediaIds, this.board.getBoardId())
      : true;
    if (!canDuplicate) {
      return;
    }

    const filteredItemMap = Object.fromEntries(
      Object.entries(this.copy(true)).filter(
        ([_, item]) => item.itemType !== "Group"
      )
    );
    this.board.duplicate(filteredItemMap);
    this.setContext("EditUnderPointer");
  }

  getMostNestedAINodeWithParents(): {
    node: AINode;
    parents: AINode[];
    lastAssistantMessageId: string | undefined;
  } | null {
    const AINodes = this.items.getItemsByItemTypes(["AINode"]) as AINode[];
    if (!AINodes.length) {
      return null;
    }

    let mostNestedNode = AINodes[0];
    let mostNestedNodeParents: AINode[] = [];
    let currentParentsCount = -1;

    AINodes.forEach((node) => {
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
    customScale?: number
  ): void {
    const mbr = (item as BaseItem).getWorldMbr();
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
    if (single?.itemType === "AINode") {
      const aiNode = single as AINode;
      const contextItemsIds = aiNode.getContextItems();
      if (contextItemsIds.length) {
        const newContextItems = this.board.items
          .listAll()
          .filter((item) => contextItemsIds.includes(item.getId()));
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

    contextItems.forEach((item) => {
      if (item.itemType === "AINode") {
        const path = item.getPath();
        path.setBorderColor(CONTEXT_NODE_HIGHLIGHT_COLOR);
        path.setBorderWidth(2);
        path.setBackgroundColor("none");
        path.render(context);
      } else {
        const itemRect = (item as BaseItem).getWorldMbr();
        itemRect.borderColor = CONTEXT_NODE_HIGHLIGHT_COLOR;
        itemRect.strokeWidth = 2;
        itemRect.render(context);
      }
    });
  }
}
