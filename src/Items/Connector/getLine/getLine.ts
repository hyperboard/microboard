import { Path } from "../../Path";
import { ControlPoint, BoardPoint } from "../ControlPoint";
import { getStraightLine } from "./getStraightLine";
import { getCurvedLine } from "./getCurvedLine";
import { getOrthogonalLine } from "./getOrthogonalLine";
import { ConnectorLineStyle } from "../Connector";
import { Pointer } from "../Pointers/Pointers";

export function getLine(
	lineStyle: ConnectorLineStyle,
	start: ControlPoint,
	end: ControlPoint,
	middle: BoardPoint[],
): Path {
	switch (lineStyle) {
		case "straight":
			return getStraightLine(start, end, middle);
		case "curved":
			return getCurvedLine(start, end, middle);
		case "orthogonal":
			return getOrthogonalLine(start, end, middle);
	}
}
