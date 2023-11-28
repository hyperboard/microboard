import { BoardPoint, ControlPointData } from "./ControlPoint";
import { ConnectorPointerStyle } from "./Pointers/ConnectorPointerStyles";
import { ConnectionLineWidth, ConnectorLineStyle } from "./Connector";
import { TransformationData } from "../Transformation";

export class ConnectorData {
	readonly itemType = "Connector";
	startPoint: ControlPointData = new BoardPoint(0, 0);
	endPoint: ControlPointData = new BoardPoint(0, 0);
	startPointerStyle: ConnectorPointerStyle = "none";
	endPointerStyle: ConnectorPointerStyle = "arrow";
	lineStyle: ConnectorLineStyle = "straight";
	lineColor = "";
	lineWidth: ConnectionLineWidth = 1;
	transformation = new TransformationData();
}

interface SetStartPoint {
	class: "Connector";
	method: "setStartPoint";
	item: string[];
	startPointData: ControlPointData;
}

interface SetEndPoint {
	class: "Connector";
	method: "setEndPoint";
	item: string[];
	endPointData: ControlPointData;
}

interface SetStartPointerStyle {
	class: "Connector";
	method: "setStartPointerStyle";
	item: string[];
	startPointerStyle: ConnectorPointerStyle;
}

interface SetEndPointerStyle {
	class: "Connector";
	method: "setEndPointerStyle";
	item: string[];
	endPointerStyle: ConnectorPointerStyle;
}

interface SetLineStyle {
	class: "Connector";
	method: "setLineStyle";
	item: string[];
	lineStyle: ConnectorLineStyle;
}

interface SetLineColor {
	class: "Connector";
	method: "setLineColor";
	item: string[];
	lineColor: string;
}

interface SetLineWidth {
	class: "Connector";
	method: "setLineWidth";
	item: string[];
	lineWidth: ConnectionLineWidth;
}

export type ConnectorOperation =
	| SetStartPoint
	| SetEndPoint
	| SetStartPointerStyle
	| SetEndPointerStyle
	| SetLineStyle
	| SetLineColor
	| SetLineWidth;
