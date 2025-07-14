import { Frame } from "./Frame";
import { FrameOperation } from "./FrameOperation";
import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";

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
				return mapItemsByOperation(frame, frame => {
					return {
						...this.operation,
						backgroundColor: frame.getBackgroundColor(),
					};
				});
			case "setCanChangeRatio":
				return mapItemsByOperation(frame, frame => {
					return {
						...this.operation,
						canChangeRatio: frame.getCanChangeRatio(),
					};
				});
			case "setFrameType":
				return mapItemsByOperation(frame, () => {
					return {
						...this.operation,
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-expect-error
						shapeType: this.operation.prevShapeType,
					};
				});
			case "addChild":
				return mapItemsByOperation(frame, frame => {
					// REFACTOR add child to mapItems
					return {
						...this.operation,
						children: frame.getChildrenIds(),
					};
				});
			case "removeChild":
				return mapItemsByOperation(frame, frame => {
					return {
						...this.operation,
						children: frame.getChildrenIds(),
					};
				});
			case "addChildren":
			case "removeChildren":
				return mapItemsByOperation(frame, item => {
					return {
						...this.operation
					};
				});
			default:
				return mapItemsByOperation(frame, item => {
					const op = this.operation;
					let newData: Record<string, any> = {}
					if (op.prevData) {
						newData = {...op.prevData};
					} else {
						Object.keys(op.newData).forEach(key => {
							// @ts-ignore
							if (item[key]) {
								// @ts-ignore
								newData[key] = item[key];
							}
						})
					}
					return {
						...op,
						newData,
					};
				});
		}
	}
}
