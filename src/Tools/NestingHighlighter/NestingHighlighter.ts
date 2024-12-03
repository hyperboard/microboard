import { Item, Frame } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { ItemWoFrames } from "Board/SpatialIndex/SpacialIndex";
import { Tool } from "Board/Tools/Tool";

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
					frameRect.borderColor = "blue";
					frameRect.strokeWidth = 1;
					frameRect.render(context);
				}

				// Render children
				group.children.forEach(child => {
					const childRect = child.getMbr();
					childRect.backgroundColor = "rgb(128, 128, 128, 0.5)";
					childRect.render(context);
				});
			});
		}
	}
}
