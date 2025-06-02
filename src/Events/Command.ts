import { Board } from 'Board';
import { ShapeCommand } from 'Items/Shape/ShapeCommand';
import { BoardCommand } from '../BoardCommand';
import { TransformationCommand } from '../Items/Transformation/TransformationCommand';
import { RichTextCommand, RichTextGroupCommand } from '../Items/RichText/RichTextCommand';
import { EventsCommand } from './EventsCommand';
import { ConnectorCommand } from 'Items/Connector/ConnectorCommand';
import { Operation } from './EventsOperations';
import { DrawingCommand } from 'Items/Drawing/DrawingCommand';
import { StickerCommand } from '../Items/Sticker/StickerCommand';
import { Connector, Frame, Item, RichText, Shape } from 'Items';
import { Drawing } from 'Items/Drawing';
import { Sticker } from 'Items/Sticker';
import { FrameCommand } from 'Items/Frame/FrameCommand';
import { Comment, CommentCommand } from '../Items/Comment';
import { LinkToCommand } from '../Items/LinkTo/LinkToCommand';
import { GroupCommand } from 'Items/Group/GroupCommand';
import { Group } from 'Items/Group';
import { PlaceholderCommand } from 'Items/Placeholder/PlaceholderCommand';
import { Placeholder } from 'Items/Placeholder';
import { ImageCommand } from 'Items/Image/ImageCommand';
import { ImageItem } from 'Items/Image';
import { VideoCommand } from 'Items/Video/VideoCommand';
import { VideoItem } from 'Items/Video/Video';
import { AudioCommand } from 'Items/Audio/AudioCommand';
import { AudioItem } from 'Items/Audio/Audio';

export interface Command {
	apply(): void;

	revert(): void;
}

export function createCommand(board: Board, operation: Operation): Command {
	// TODO API
	try {
		switch (operation.class) {
			case 'Events': {
				const events = board.events;
				if (!events) {
					return new NoOpCommand('Board Has No Events Record');
				}
				return new EventsCommand(board, operation);
			}
			case 'Board': {
				return new BoardCommand(board, operation);
			}
			default: {
				const itemType = operation.class;
				const itemIdList =
					'item' in operation
						? Array.isArray(operation.item)
							? operation.item
							: [operation.item]
						: 'items' in operation
						? Object.keys(operation.items)
						: Object.values(operation.itemsOps);

				const items = itemIdList
					.map(itemId => board.items.findById(itemId) ?? itemId)
					.filter((item): item is Item => {
						if (typeof item === 'string') {
							console.warn(
								`Item with ID ${item} not found for operation ${operation.class}.${operation.method}`
							);
							return false;
						}
						if (
							operation.class !== 'Transformation' &&
							operation.class !== 'RichText' &&
							operation.class !== 'LinkTo' &&
							item.itemType !== operation.class
						) {
							console.warn(
								`Item with ID ${item} is not of operation type: ${itemType}.`
							);
							return false;
						}
						return true;
					});

				switch (operation.class) {
					case 'Connector':
						return new ConnectorCommand(
							items.filter(
								(item): item is Connector => item.itemType === 'Connector'
							),
							operation
						);
					case 'Shape':
						return new ShapeCommand(
							items.filter((item): item is Shape => item.itemType === 'Shape'),
							operation
						);
					case 'Drawing':
						return new DrawingCommand(
							items.filter((item): item is Drawing => item.itemType === 'Drawing'),
							operation
						);
					case 'Comment':
						return new CommentCommand(
							items.filter((item): item is Comment => item.itemType === 'Comment'),
							operation
						);
					case 'Sticker':
						return new StickerCommand(
							items.filter((item): item is Sticker => item.itemType === 'Sticker'),
							operation
						);
					case 'LinkTo':
						return new LinkToCommand(
							items.map(item => item.linkTo),
							operation
						);
					case 'Transformation':
						return new TransformationCommand(
							items.map(item => item.transformation),
							operation
						);
					case 'RichText':
						if (operation.method === 'groupEdit') {
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
								operation
							);
						}
					case 'Frame':
						return new FrameCommand(
							items.filter((item): item is Frame => item.itemType === 'Frame'),
							operation
						);
					case 'Placeholder':
						return new PlaceholderCommand(
							items.filter(
								(item): item is Placeholder => item.itemType === 'Placeholder'
							),
							operation
						);
					case 'Group':
						return new GroupCommand(
							items.filter((item): item is Group => item.itemType === 'Group'),
							operation
						);
					case 'Image':
						return new ImageCommand(
							items.filter((item): item is ImageItem => item.itemType === 'Image'),
							operation
						);
					case 'Video':
						return new VideoCommand(
							items.filter((item): item is VideoItem => item.itemType === 'Video'),
							operation
						);
					case 'Audio':
						return new AudioCommand(
							items.filter((item): item is AudioItem => item.itemType === 'Audio'),
							operation
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

	merge(_op: unknown): this {
		return this;
	}

	apply(): void {
		console.warn(`NoOpCommand applied due to: ${this.reason}`);
	}

	revert(): void {
		console.warn(`NoOpCommand reverted due to: ${this.reason}`);
	}
}
