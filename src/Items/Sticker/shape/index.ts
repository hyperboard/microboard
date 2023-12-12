import {Mbr, Line, Path, Point, Paths} from "Board/Items/index";

// @todo параметры приходят из доски или из стикера?
const DEFAULTS = [213,244];

export const StickerShape = {
	name: "Sticker",
	textBounds: new Mbr(5,  5, DEFAULTS[0] - 5, DEFAULTS[1] - 5),
	path: new Paths([new Path(
			[
				new Line(new Point(2,  2), new Point(DEFAULTS[0],  2)),
				new Line(new Point(DEFAULTS[0],  2), new Point(DEFAULTS[0], DEFAULTS[1])),
				new Line(new Point(DEFAULTS[0], DEFAULTS[1]), new Point(2, DEFAULTS[1])),
				new Line(new Point(2, DEFAULTS[1]), new Point(2,  2)),
			],
			true,
			'rgba(255,255,255,.1)',
			'transparent',
		'solid',0,0,0,'black',15
		),
		new Path([
			new Line(new Point(0, 0), new Point(DEFAULTS[0], 0)),
			new Line(new Point(DEFAULTS[0], 0), new Point(DEFAULTS[0], DEFAULTS[1])),
			new Line(new Point(DEFAULTS[0], DEFAULTS[1]), new Point(0, DEFAULTS[1])),
			new Line(new Point(0, DEFAULTS[1]), new Point(0, 0)),
		], true, 'yellow', 'transparent')
	], 'yellow', 'black', 'solid', 1, 1, 1,
		(m,v, p, i) => {
			return i === 1 && (m !== 'setBackgroundColor' || v)
		}
			// && ['setBackgroundColor'].indexOf(m) > -1
	),
	anchorPoints: [
		new Point(0, (DEFAULTS[1]) / 2),
		new Point(DEFAULTS[0], (DEFAULTS[1]) / 2),
		new Point((DEFAULTS[0]) / 2, 0),
		new Point((DEFAULTS[0]) / 2, 0),
	],
	DEFAULTS
};
