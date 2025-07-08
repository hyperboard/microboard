import { Frame, Item } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import {
	FRAME_HIGHLIGHTER_BORDER_COLOR,
	FRAME_CHILDREN_HIGHLIGHTER_COLOR,
	FRAME_CHILDREN_HIGHLIGHTER_BORDER_COLOR,
} from 'Items/Frame/FrameData';
import { Tool } from 'Tools/Tool';
import {BaseItem} from "../../Items/BaseItem";

interface HighlightGroup {
	groupItem?: BaseItem;
	children: Item[];
}

export class NestingHighlighter extends Tool {
	private toHighlight: HighlightGroup[] = [];

	clear(): void {
		this.toHighlight = [];
	}

	listAll(): HighlightGroup[] {
		return this.toHighlight;
	}

	add(groupItem: BaseItem, children: Item | Item[]): void {
		const existing = this.toHighlight.find(group => group.groupItem === groupItem);
		const array = Array.isArray(children) ? children : [children];
		if (existing) {
			array.forEach(child => {
				if (!existing.children.includes(child)) {
					existing.children.push(child);
				}
			});
		} else {
			this.toHighlight.push({ groupItem, children: array });
		}
	}

	addSingleItem(item: Item): void {
		this.toHighlight.push({ children: [item] });
	}

	/** Remvoe children only, frames would be cleaned when empty */
	remove(item: Item): void {
		this.toHighlight.forEach(group => {
			group.children = group.children.filter(child => child !== item);
		});
		this.toHighlight = this.toHighlight.filter(group => group.children.length > 0);
	}

	render(context: DrawingContext): void {
		if (this.toHighlight.length > 0) {
			this.toHighlight.forEach(group => {
				// Render frame
				if (group.groupItem) {
					const frameRect = group.groupItem.getMbr();
					frameRect.borderColor = FRAME_HIGHLIGHTER_BORDER_COLOR;
					frameRect.strokeWidth = 0.3;
					frameRect.render(context);
				}

				// Render children
				group.children.forEach(child => {
					child.render(context);
					const childRect = child.getMbr();
					childRect.backgroundColor = FRAME_CHILDREN_HIGHLIGHTER_COLOR;
					childRect.borderColor = FRAME_CHILDREN_HIGHLIGHTER_BORDER_COLOR;
					childRect.strokeWidth = 0.3;
					childRect.render(context);
				});
			});
		}
	}
}
