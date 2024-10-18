import { AddDrawing } from "./AddDrawing";
import {
	DEFAULT_HIGHLIGHTER_COLOR,
	DRAWING_STROKE_STYLE,
	HIGHLIGHTER_SETTINGS_KEY,
	INITIAL_HIGHLIGHTER_STROKE_WIDTH,
} from "../../../View/Tools/AddDrawing";
import { BorderStyle } from "../../Items/Path";
import { Board } from "../../Board";

export class AddHighlighter extends AddDrawing {
	strokeWidth = INITIAL_HIGHLIGHTER_STROKE_WIDTH;
	strokeColor = DEFAULT_HIGHLIGHTER_COLOR;
	strokeStyle: BorderStyle = DRAWING_STROKE_STYLE;

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
