import { StickerOperation } from "./StickerOperation";
import { Command } from "../../Events";
import { Sticker } from "./index";

export class StickerCommand implements Command {
	private reverse: { item: Sticker; operation: StickerOperation }[];

	constructor(
		private sticker: Sticker[],
		private operation: StickerOperation,
	) {
		this.reverse = this.getReverse();
	}

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
				return this.sticker.map(sticker => {
					return {
						item: sticker,
						operation: {
							...this.operation,
							backgroundColor: sticker.getBackgroundColor(),
						},
					};
				});
		}
	}
}
