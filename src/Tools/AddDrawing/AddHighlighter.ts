import { AddDrawing } from "./AddDrawing";
import {
	HIGHLIGHTER_DEFAULT_COLOR,
	PEN_STROKE_STYLE,
	HIGHLIGHTER_SETTINGS_KEY,
	HIGHLIGHTER_INITIAL_STROKE_WIDTH,
} from "Board/Settings";
import { BorderStyle } from "../../Items/Path";
import { Board } from "../../Board";

export class AddHighlighter extends AddDrawing {
	strokeWidth = HIGHLIGHTER_INITIAL_STROKE_WIDTH;
	strokeColor = HIGHLIGHTER_DEFAULT_COLOR;
	strokeStyle: BorderStyle = PEN_STROKE_STYLE;

	constructor(board: Board) {
		super(board);
		this.setCursor();

		if (HIGHLIGHTER_SETTINGS_KEY) {
			const highlighterSettings = localStorage.getItem(
				HIGHLIGHTER_SETTINGS_KEY,
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
			HIGHLIGHTER_SETTINGS_KEY,
			JSON.stringify({
				strokeWidth: this.strokeWidth,
				strokeColor: this.strokeColor,
				strokeStyle: this.strokeStyle,
			}),
		);
	}
}
