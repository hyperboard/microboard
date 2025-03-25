import { AddDrawing } from "./AddDrawing";
import { conf } from "Board/Settings";
import { BorderStyle } from "../../Items/Path";
import { Board } from "../../Board";

export class AddHighlighter extends AddDrawing {
	strokeWidth = conf.HIGHLIGHTER_INITIAL_STROKE_WIDTH;
	strokeColor = conf.HIGHLIGHTER_DEFAULT_COLOR;
	strokeStyle: BorderStyle = conf.PEN_STROKE_STYLE;

	constructor(board: Board) {
		super(board);
		this.setCursor();

		if (conf.HIGHLIGHTER_SETTINGS_KEY) {
			const highlighterSettings = localStorage.getItem(
				conf.HIGHLIGHTER_SETTINGS_KEY,
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
			conf.HIGHLIGHTER_SETTINGS_KEY,
			JSON.stringify({
				strokeWidth: this.strokeWidth,
				strokeColor: this.strokeColor,
				strokeStyle: this.strokeStyle,
			}),
		);
	}
}
