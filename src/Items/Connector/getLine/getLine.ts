import { Path } from "../../Path";
import { ConnectorLineStyle } from "../Connector";
import {BoardPoint, ControlPoint} from "../ControlPoint";
import { getCurvedLine } from "./getCurvedLine";
import { getOrthogonalLine } from "./getOrthogonalLine";
import { getStraightLine } from "./getStraightLine";

export function getLine(
	lineStyle: ConnectorLineStyle,
	start: ControlPoint,
	end: ControlPoint,
	middle: ControlPoint | null,
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
