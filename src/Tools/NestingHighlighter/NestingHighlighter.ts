import { Item, Frame } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Tool } from "Board/Tools/Tool";
import { FRAME_CHILDREN_HIGHLIGHTER_BORDER_COLOR, FRAME_CHILDREN_HIGHLIGHTER_COLOR, FRAME_HIGHLIGHTER_BORDER_COLOR } from "View/Items/Frame";

interface HighlightGroup {
	frame?: Frame;
	children: Item[];
}

export class NestingHighlighter extends Tool {
	private toHighlight: HighlightGroup[] = [];

	constructor() {
		super();
	}

	clear(): void {
		this.toHighlight = [];
	}

	listAll(): HighlightGroup[] {
		return this.toHighlight;
	}

	add(frame: Frame, children: Item | Item[]): void {
		const existing = this.toHighlight.find(group => group.frame === frame);
		const array = Array.isArray(children) ? children : [children];
		if (existing) {
			array.forEach(child => {
				if (!existing.children.includes(child)) {
					existing.children.push(child);
				}
			});
		} else {
			this.toHighlight.push({ frame, children: array });
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
		this.toHighlight = this.toHighlight.filter(
			group => group.children.length > 0,
		);
	}

	render(context: DrawingContext): void {
		if (this.toHighlight.length > 0) {
			this.toHighlight.forEach(group => {
				// Render frame
				if (group.frame) {
					const frameRect = group.frame.getMbr();
					frameRect.borderColor = FRAME_HIGHLIGHTER_BORDER_COLOR;
					frameRect.strokeWidth = 0.3;
					frameRect.render(context);
				}

				// Render children
				group.children.forEach(child => {
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