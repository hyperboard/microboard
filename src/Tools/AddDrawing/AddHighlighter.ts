import { AddDrawing } from "./AddDrawing";
import { SETTINGS } from "Board/Settings";
import { BorderStyle } from "../../Items/Path";
import { Board } from "../../Board";

export class AddHighlighter extends AddDrawing {
	strokeWidth = SETTINGS.HIGHLIGHTER_INITIAL_STROKE_WIDTH;
	strokeColor = SETTINGS.HIGHLIGHTER_DEFAULT_COLOR;
	strokeStyle: BorderStyle = SETTINGS.PEN_STROKE_STYLE;

	constructor(board: Board) {
		super(board);
		this.setCursor();

		if (SETTINGS.HIGHLIGHTER_SETTINGS_KEY) {
			const highlighterSettings = localStorage.getItem(
				SETTINGS.HIGHLIGHTER_SETTINGS_KEY,
			);
			if (highlighterSettings) {
				const { strokeWidth, strokeColor, strokeStyle } =
					JSON.parse(highlighterSettings);
				this.strokeWidth = strokeWidth;
				this.strokeColor = strokeColor;
				this.strokeStyle = strokeStyle;
			}
		}
	}

	isHighlighter(): boolean {
		return true;
	}

	private updateSettings() {
		localStorage.setItem(
			SETTINGS.HIGHLIGHTER_SETTINGS_KEY,
			JSON.stringify({
				strokeWidth: this.strokeWidth,
				strokeColor: this.strokeColor,
				strokeStyle: this.strokeStyle,
			}),
		);
	}
}
