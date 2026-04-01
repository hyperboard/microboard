import { Line, Mbr, Path } from 'Items';
import { ControlPoint, BoardPoint } from '../ControlPoint';
import { findOrthogonalPath } from './findOrthogonalPath';
import { BaseItem } from '../../BaseItem/BaseItem';
import type { Item } from '../../Item';

function getItemWorldMbr(item: Item): Mbr {
	if (item instanceof BaseItem && item.parent !== 'Board') {
		return item.getWorldMbr();
	}
	return item.getMbr();
}

export function getOrthogonalLine(
	start: ControlPoint,
	end: ControlPoint,
	middle: ControlPoint | null,
	skipObstacles = false
): Path {
	const obstacles: Mbr[] = [];

	if (start.pointType !== 'Board' && !skipObstacles) {
		obstacles.push(getItemWorldMbr(start.item));
	}
	if (end.pointType !== 'Board' && !skipObstacles) {
		obstacles.push(getItemWorldMbr(end.item));
	}

	const { lines, newStart, newEnd } = findOrthogonalPath(
		start,
		end,
		obstacles,
		middle ? [middle] : undefined
	);

	if (lines.length === 0) {
		if (obstacles.length > 0) {
			return getOrthogonalLine(start, end, middle, true);
		}
		return new Path([new Line(newStart || start, newEnd || end)]);
	}

	return new Path(lines);
}
