import {Mbr, Line, Path, Point, Paths} from "Board/Items";

const DEFAULTS = [-50,-50,50,50];

export const Sticker = {
	name: "Sticker",
	textBounds: new Mbr(DEFAULTS[0] + 5, DEFAULTS[1] + 5, DEFAULTS[2] - 5, DEFAULTS[3] - 5),
	path: new Paths([new Path(
			[
				new Line(new Point(DEFAULTS[0] + 2, DEFAULTS[1] + 2), new Point(DEFAULTS[2], DEFAULTS[1] + 2)),
				new Line(new Point(DEFAULTS[2], DEFAULTS[1] + 2), new Point(DEFAULTS[2], DEFAULTS[3])),
				new Line(new Point(DEFAULTS[2], DEFAULTS[3]), new Point(DEFAULTS[0] + 2, DEFAULTS[3])),
				new Line(new Point(DEFAULTS[0] + 2, DEFAULTS[3]), new Point(DEFAULTS[0] + 2, DEFAULTS[1] + 2)),
			],
			true,
			'rgba(255,255,255,.1)',
			'transparent',
		'solid',0,0,0,'black',15
		),
		new Path([
			new Line(new Point(DEFAULTS[0], DEFAULTS[1]), new Point(DEFAULTS[2], DEFAULTS[1])),
			new Line(new Point(DEFAULTS[2], DEFAULTS[1]), new Point(DEFAULTS[2], DEFAULTS[3])),
			new Line(new Point(DEFAULTS[2], DEFAULTS[3]), new Point(DEFAULTS[0], DEFAULTS[3])),
			new Line(new Point(DEFAULTS[0], DEFAULTS[3]), new Point(DEFAULTS[0], DEFAULTS[1])),
		], true, 'yellow', 'transparent')
	], 'yellow', 'black', 'solid', 1, 1, 1,
		(m,v, p, i) => {
			return i === 1 && (m !== 'setBackgroundColor' || v)
		}
			// && ['setBackgroundColor'].indexOf(m) > -1
	),
	anchorPoints: [
		new Point(DEFAULTS[0], (DEFAULTS[3] - DEFAULTS[1]) / 2),
		new Point(DEFAULTS[2], (DEFAULTS[3] - DEFAULTS[1]) / 2),
		new Point((DEFAULTS[2] - DEFAULTS[0]) / 2, DEFAULTS[1]),
		new Point((DEFAULTS[2] - DEFAULTS[0]) / 2, DEFAULTS[1]),
	]
};
