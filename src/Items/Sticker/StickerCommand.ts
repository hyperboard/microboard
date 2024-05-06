import { StickerOperation } from "./StickerOperation";
import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";
import { Sticker } from "./index";

export class StickerCommand implements Command {
	private reverse = this.getReverse();

	constructor(
		private sticker: Sticker[],
		private operation: StickerOperation,
	) {}

	apply(): void {
		for (const sticker of this.sticker) {
			sticker.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Sticker; operation: StickerOperation }[] {
		switch (this.operation.method) {
			case "setBackgroundColor":
				return mapItemsByOperation(this.sticker, sticker => {
					return {
						...this.operation,
						backgroundColor: sticker.getBackgroundColor(),
					};
				});
		}
	}
}
