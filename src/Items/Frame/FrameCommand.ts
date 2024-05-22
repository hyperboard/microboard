import { Frame } from "./Frame";
import { FrameOperation } from "./FrameOperation";
import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";

export class FrameCommand implements Command {
	private reverse = this.getReverse();

	constructor(private frame: Frame[], private operation: FrameOperation) {}

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
			case "addChild":
				return mapItemsByOperation(frame, frame => { // REFACTOR add child to mapItems 
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
		}
	}
}
