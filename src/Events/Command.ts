import { Board } from "Board";
import { ShapeCommand } from "Board/Items/Shape/ShapeCommand";
import { BoardCommand } from "../BoardCommand";
import { TransformationCommand } from "../Items/Transformation/TransformationCommand";
import { RichTextCommand } from "../Items/RichText/RichTextCommand";
import { EventsCommand } from "./EventsCommand";
import { ConnectorCommand } from "Board/Items/Connector/ConnectorCommand";
import { Events } from "./Events";
import { Operation } from "./EventsOperations";
import { DrawingCommand } from "Board/Items/Drawing/DrawingCommand";
import {StickerCommand} from "../Items/Sticker/StickerCommand";

export interface Command {
	apply(): void;

	revert(): void;
}

export function createCommand(
	events: Events,
	board: Board,
	operation: Operation,
): Command {
	// TODO API
	switch (operation.class) {
		case "Events": {
			return new EventsCommand(events, operation);
		}
		case "Board": {
			return new BoardCommand(board, operation);
		}
		case "Connector": {
			const itemIdList = Array.isArray(operation.item)
				? operation.item
				: [operation.item];
			const items = itemIdList.map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {
					throw new Error(
						"Create connector command. Connector not found.",
					);
				}
				if (item.itemType !== "Connector") {
					throw new Error(
						"Create connector command. Item is not a Connector.",
					);
				}
				return item;
			});
			return new ConnectorCommand(items, operation);
		}
		case "Shape": {
			const itemIdList = Array.isArray(operation.item)
				? operation.item
				: [operation.item];
			const items = itemIdList.map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {
					throw new Error("Create shape command. Shape not found.");
				}
				if (item.itemType !== "Shape") {
					throw new Error(
						"Create shape command. Item is not a Shape.",
					);
				}
				return item;
			});
			return new ShapeCommand(items, operation);
		}
		case "Sticker": {
			return new StickerCommand((Array.isArray(operation.item)
				? operation.item
				: [operation.item]
			).map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {throw new Error("Create shape command. Shape not found.");}
				if (item.itemType !== "Sticker") {throw new Error("Create shape command. Item is not a Shape.",);}
				return item;
			}), operation);
		}
		case "Transformation": {
			const itemIdList = Array.isArray(operation.item)
				? operation.item
				: [operation.item];
			const transformations = itemIdList.map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {
					throw new Error(
						`Create transformation command. Item (#${itemId}) not found.`,
					);
				}
				return item.transformation;
			});
			return new TransformationCommand(transformations, operation);
		}
		case "RichText": {
			const itemIdList = Array.isArray(operation.item)
				? operation.item
				: [operation.item];
			const richTextList = itemIdList.map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {
					throw new Error(
						"Create RichText command. RichText not found.",
					);
				}
				return item.itemType === "RichText" ? item : item.text;
			});
			return new RichTextCommand(richTextList, operation);
		}
		case "Drawing": {
			const itemIdList = Array.isArray(operation.item)
				? operation.item
				: [operation.item];
			const drawingList = itemIdList.map(itemId => {
				const item = board.items.findById(itemId);
				if (!item) {
					throw new Error(
						"Create Drawing command. Drawing not found.",
					);
				}
				if (item.itemType !== "Drawing") {
					throw new Error(
						"Create Drawing command. Item is not a Drawing.",
					);
				}
				return item;
			});
			return new DrawingCommand(drawingList, operation);
		}
	}
}
