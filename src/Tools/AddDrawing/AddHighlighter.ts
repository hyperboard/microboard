import { Board } from 'Board';
import { Drawing } from 'Items/Drawing';
import { propertyOps } from 'Items/propertyOps';
import { BorderStyle } from 'Items/Path';
import { conf } from 'Settings';
import { ColorValue, semanticColor } from 'Color';
import { AddDrawing } from './AddDrawing';

export class AddHighlighter extends AddDrawing {
	strokeWidth = conf.HIGHLIGHTER_INITIAL_STROKE_WIDTH;
	strokeColor: ColorValue | string = semanticColor('contrastGreen');
	strokeStyle: BorderStyle = conf.PEN_STROKE_STYLE;

	constructor(board: Board) {
		super(board);
		this.setCursor();

		if (conf.HIGHLIGHTER_SETTINGS_KEY) {
			const highlighterSettings = localStorage.getItem(conf.HIGHLIGHTER_SETTINGS_KEY);
			if (highlighterSettings) {
				const { strokeWidth, strokeColor, strokeStyle } = JSON.parse(highlighterSettings);
				this.strokeWidth = strokeWidth;
				this.strokeColor = strokeColor;
				this.strokeStyle = strokeStyle;
			}
		}
	}

	isHighlighter(): boolean {
		return true;
	}

	protected applyDrawingRole(drawing: Drawing): void {
		drawing.setColorRole('background');
		drawing.apply(propertyOps.setProperty([drawing], "borderOpacity", 0.5));
	}

	protected updateSettings(): void {
		localStorage.setItem(
			conf.HIGHLIGHTER_SETTINGS_KEY,
			JSON.stringify({
				strokeWidth: this.strokeWidth,
				strokeColor: this.strokeColor,
				strokeStyle: this.strokeStyle,
			})
		);
	}
}
