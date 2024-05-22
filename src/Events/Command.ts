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
import { StickerCommand } from "../Items/Sticker/StickerCommand";
import { Connector, Item, Shape } from "Board/Items";
import { Drawing } from "Board/Items/Drawing";
import { Sticker } from "Board/Items/Sticker";

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
	try {
		switch (operation.class) {
			case "Events": {
				return new EventsCommand(events, operation);
			}
			case "Board": {
				return new BoardCommand(board, operation);
			}
			default: {
				const itemType = operation.class;
				const itemIdList =
					operation.method !== "transformMany"
						? Array.isArray(operation.item)
							? operation.item
							: [operation.item]
						: Object.keys(operation.items);
				const items = itemIdList
					.map(itemId => board.items.findById(itemId) ?? itemId)
					.filter((item): item is Item => {
						if (typeof item === "string") {
							console.warn(`Item with ID ${item} not found.`);
							return false;
						}
						if (
							operation.class !== "Transformation" &&
							operation.class !== "RichText" &&
							item.itemType !== operation.class
						) {
							console.warn(
								`Item with ID ${item} is not of operation type: ${itemType}.`,
							);
							return false;
						}
						return true;
					});

				switch (operation.class) {
					case "Connector":
						return new ConnectorCommand(
							items.filter(
								(item): item is Connector =>
									item.itemType === "Connector",
							),
							operation,
						);
					case "Shape":
						return new ShapeCommand(
							items.filter(
								(item): item is Shape =>
									item.itemType === "Shape",
							),
							operation,
						);
					case "Drawing":
						return new DrawingCommand(
							items.filter(
								(item): item is Drawing =>
									item.itemType === "Drawing",
							),
							operation,
						);
					case "Sticker":
						return new StickerCommand(
							items.filter(
								(item): item is Sticker =>
									item.itemType === "Sticker",
							),
							operation,
						);
					case "Transformation":
						return new TransformationCommand(
							items.map(item => item.transformation),
							operation,
						);
					case "RichText":
						return new RichTextCommand(
							items.map(item =>
								item.itemType === "RichText" ? item : item.text,
							),
							operation,
						);
					default:
						return new NoOpCommand(`Unsupported command type`);
				}
			}
		}
	} catch (error) {
		if (error instanceof Error) {
			return new NoOpCommand(error.message);
		} else {
			return new NoOpCommand(`An unknown error occurred: ${error}`);
		}
	}
}

class NoOpCommand {
	constructor(public reason: string) {}

	apply(): void {
		console.warn(`NoOpCommand applied due to: ${this.reason}`);
	}

	revert(): void {
		console.warn(`NoOpCommand reverted due to: ${this.reason}`);
	}
}
