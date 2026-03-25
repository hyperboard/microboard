import { Frame } from "./Frame";
import { FrameOperation } from "./FrameOperation";
import { Command } from "../../Events";

export class FrameCommand implements Command {
	private reverse: { item: Frame; operation: FrameOperation }[];

	constructor(
		private frame: Frame[],
		private operation: FrameOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const frame of this.frame) {
			frame.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Frame; operation: FrameOperation }[] {
		const frame = this.frame;
		switch (this.operation.method) {
			case "setBackgroundColor":
				return frame.map(frame => {
					return {
						item: frame,
						operation: {
							...this.operation,
							backgroundColor: frame.getBackgroundColor(),
						},
					};
				});
			case "setCanChangeRatio":
				return frame.map(frame => {
					return {
						item: frame,
						operation: {
							...this.operation,
							canChangeRatio: frame.getCanChangeRatio(),
						},
					};
				});
			case "setFrameType":
				return frame.map(frame => {
					return {
						item: frame,
						operation: {
							...this.operation,
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-expect-error
							shapeType: this.operation.prevShapeType,
						},
					};
				});
			case "addChild":
				return frame.map(frame => {
					// REFACTOR add child to mapItems
					return {
						item: frame,
						operation: {
							...this.operation,
							children: frame.getChildrenIds(),
						},
					};
				});
			case "removeChild":
				return frame.map(frame => {
					return {
						item: frame,
						operation: {
							...this.operation,
							children: frame.getChildrenIds(),
						},
					};
				});
			case "addChildren":
			case "removeChildren":
				return frame.map(item => {
					return {
						item,
						operation: {
							...this.operation
						},
					};
				});
		}
	}
}
