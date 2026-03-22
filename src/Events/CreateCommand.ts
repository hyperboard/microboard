import {Board} from 'Board';
import {ShapeCommand} from 'Items/Shape/ShapeCommand';
import {BoardCommand} from '../BoardCommand';
import {TransformationCommand} from '../Items/Transformation/TransformationCommand';
import {RichTextCommand, RichTextGroupCommand} from '../Items/RichText/RichTextCommand';
import {EventsCommand} from './EventsCommand';
import {ConnectorCommand} from 'Items/Connector/ConnectorCommand';
import {BaseOperation, ItemOperation, Operation} from './EventsOperations';
import {DrawingCommand} from 'Items/Drawing/DrawingCommand';
import {StickerCommand} from '../Items/Sticker/StickerCommand';
import {
	Connector,
	ConnectorOperation,
	Frame,
	FrameOperation,
	Item,
	RichText,
	RichTextOperation,
	Shape,
	ShapeOperation,
	StickerOperation,
	TransformationOperation
} from 'Items';
import {Drawing} from 'Items/Drawing';
import {Sticker} from 'Items/Sticker';
import {FrameCommand} from 'Items/Frame/FrameCommand';
import {Comment, CommentCommand, CommentOperation} from '../Items/Comment';
import {LinkToCommand} from '../Items/LinkTo/LinkToCommand';
import {GroupCommand} from 'Items/Group/GroupCommand';
import {Group} from 'Items/Group';
import {PlaceholderCommand} from 'Items/Placeholder/PlaceholderCommand';
import {Placeholder} from 'Items/Placeholder';
import {ImageCommand} from 'Items/Image/ImageCommand';
import {ImageItem} from 'Items/Image';
import {VideoCommand} from 'Items/Video/VideoCommand';
import {VideoItem} from 'Items/Video/Video';
import {AudioCommand} from 'Items/Audio/AudioCommand';
import {AudioItem} from 'Items/Audio/Audio';
import {DrawingOperation} from "../Items/Drawing/DrawingOperation";
import {PlaceholderOperation} from "../Items/Placeholder/PlaceholderOperation";
import {GroupOperation} from "../Items/Group/GroupOperation";
import {LinkToOperation} from "../Items/LinkTo/LinkToOperation";
import {ImageOperation} from "../Items/Image";
import {VideoOperation} from "../Items/Video/VideoOperation";
import {AudioOperation} from "../Items/Audio/AudioOperation";
import { Command, NoOpCommand, ItemCommandFactory } from './Command';

export const itemCommandFactories: Record<string, ItemCommandFactory> = {
	Sticker: createStickerCommand,
	Shape: createShapeCommand,
	RichText: createRichTextCommand,
	Connector: createConnectorCommand,
	Image: createImageCommand,
	Drawing: createDrawingCommand,
	Frame: createFrameCommand,
	Placeholder: createPlaceholderCommand,
	Comment: createCommentCommand,
	Group: createGroupCommand,
	Video: createVideoCommand,
	Audio: createAudioCommand,
	Transformation: createTransformationCommand,
	LinkTo: createLinkToCommand,
};

function createConnectorCommand(items: Item[], operation: ItemOperation) {
	return new ConnectorCommand(
		items.filter(
			(item): item is Connector => item.itemType === "Connector",
		),
		operation as ConnectorOperation,
	);
}

function createShapeCommand(items: Item[], operation: ItemOperation) {
	return new ShapeCommand(
		items.filter((item): item is Shape => item.itemType === "Shape"),
		operation as ShapeOperation,
	);
}

function createDrawingCommand(items: Item[], operation: ItemOperation) {
	return new DrawingCommand(
		items.filter((item): item is Drawing => item.itemType === "Drawing"),
		operation as DrawingOperation,
	);
}

function createCommentCommand(items: Item[], operation: ItemOperation) {
	return new CommentCommand(
		items.filter((item): item is Comment => item.itemType === "Comment"),
		operation as CommentOperation,
	);
}

function createStickerCommand(items: Item[], operation: ItemOperation) {
	return new StickerCommand(
		items.filter((item): item is Sticker => item.itemType === "Sticker"),
		operation as StickerOperation,
	);
}

function createFrameCommand(items: Item[], operation: ItemOperation) {
	return new FrameCommand(
		items.filter((item): item is Frame => item.itemType === "Frame"),
		operation as FrameOperation,
	);
}

function createPlaceholderCommand(items: Item[], operation: ItemOperation) {
	return new PlaceholderCommand(
		items.filter(
			(item): item is Placeholder => item.itemType === "Placeholder",
		),
		operation as PlaceholderOperation,
	);
}

function createGroupCommand(items: Item[], operation: ItemOperation) {
	return new GroupCommand(
		items.filter((item): item is Group => item.itemType === "Group"),
		operation as GroupOperation,
	);
}

function createImageCommand(items: Item[], operation: ItemOperation) {
	return new ImageCommand(
		items.filter((item): item is ImageItem => item.itemType === "Image"),
		operation as ImageOperation,
	);
}

function createVideoCommand(items: Item[], operation: ItemOperation) {
	return new VideoCommand(
		items.filter((item): item is VideoItem => item.itemType === "Video"),
		operation as VideoOperation,
	);
}

function createAudioCommand(items: Item[], operation: ItemOperation) {
	return new AudioCommand(
		items.filter((item): item is AudioItem => item.itemType === "Audio"),
		operation as AudioOperation,
	);
}

function createRichTextCommand(
	items: Item[],
	operation: ItemOperation,
	board?: Board,
) {
	if (!board) {
		return new NoOpCommand(`Board not found`);
	}
	if (operation.method === "groupEdit") {
		const texts: RichText[] = [];
		for (const { item } of operation.itemsOps) {
			const found = board.items.findById(item);
			const text = found?.getRichText();
			if (text) {
				texts.push(text);
			}
		}
		return new RichTextGroupCommand(texts, operation);
	} else {
		return new RichTextCommand(
			board,
			items.map(item => item.getId()),
			operation as RichTextOperation,
		);
	}
}

function createTransformationCommand(items: Item[], operation: ItemOperation) {
	return new TransformationCommand(
		items.map(item => item.transformation),
		operation as TransformationOperation,
		items,
	);
}

function createLinkToCommand(items: Item[], operation: ItemOperation) {
	return new LinkToCommand(
		items.map(item => item.linkTo),
		operation as LinkToOperation,
	);
}

export function createCommand(board: Board, operation: Operation): Command {
	// TODO API
	try {
		switch (operation.class) {
			case "Events": {
				const events = board.events;
				if (!events) {
					return new NoOpCommand("Board Has No Events Record");
				}
				return new EventsCommand(board, operation);
			}
			case "Board": {
				return new BoardCommand(board, operation);
			}
			default: {
				const itemType = operation.class;
				const itemIdList = getItemIdListFromOp(operation);

				const items = itemIdList
					.map(itemId => board.items.findById(itemId))
					.filter((item): item is Item => {
						if (!item) {
							return false;
						}
						if (
							operation.class !== "Transformation" &&
							operation.class !== "RichText" &&
							operation.class !== "LinkTo" &&
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
						return itemCommandFactories["Connector"](
							items,
							operation,
						);
					case "Shape":
						return itemCommandFactories["Shape"](items, operation);
					case "Drawing":
						return itemCommandFactories["Drawing"](
							items,
							operation,
						);
					case "Comment":
						return itemCommandFactories["Comment"](
							items,
							operation,
						);
					case "Sticker":
						return itemCommandFactories["Sticker"](
							items,
							operation,
						);
					case "LinkTo":
						return itemCommandFactories["LinkTo"](items, operation);
					case "Transformation":
						return itemCommandFactories["Transformation"](
							items,
							operation,
						);
					case "RichText":
						return itemCommandFactories["RichText"](
							items,
							operation,
							board,
						);
					case "Frame":
						return itemCommandFactories["Frame"](items, operation);
					case "Placeholder":
						return itemCommandFactories["Placeholder"](
							items,
							operation,
						);
					case "Group":
						return itemCommandFactories["Group"](items, operation);
					case "Image":
						return itemCommandFactories["Image"](items, operation);
					case "Video":
						return itemCommandFactories["Video"](items, operation);
					case "Audio":
						return itemCommandFactories["Audio"](items, operation);
					default: {
						const itemOp = operation as ItemOperation | TransformationOperation;
						const opClass = itemOp.class;
						const commandFactory = itemCommandFactories[opClass];
						if (!commandFactory) {
							return new NoOpCommand(`Unsupported command type: ${opClass}`);
						}
						return commandFactory(items, itemOp, board);
					}
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

function getItemIdListFromOp(operation: Operation): string[] {
	if ("item" in operation) {
		const item = (operation as { item: string | string[] | Record<string, unknown> }).item;
		if (Array.isArray(item)) {
			return item;
		}
		if (typeof item === "string") {
			return [item];
		}
		return Object.keys(item);
	}
	if ("itemsMap" in operation) {
		return Object.keys((operation as { itemsMap: Record<string, unknown> }).itemsMap);
	}
	if ("items" in operation) {
		const items = (operation as { items: (string | { id: string })[] | Record<string, unknown> }).items;
		if (Array.isArray(items)) {
			return items.map((i) => (typeof i === "string" ? i : i.id));
		}
		return Object.keys(items);
	}
	if ("itemsOps" in operation) {
		return (operation as { itemsOps: { item: string }[] }).itemsOps.map(itemOp => itemOp.item);
	}
	return [];
}
