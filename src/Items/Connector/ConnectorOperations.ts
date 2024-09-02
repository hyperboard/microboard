import { BoardPoint, ControlPointData, FindItemFn } from "./ControlPoint";
import { ConnectionLineWidth, ConnectorLineStyle } from "./Connector";
import { ConnectorPointerStyle } from "./Pointers/Pointers";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { DefaultTransformationData } from "../Transformation/TransformationData";

export class ConnectorData {
	readonly itemType = "Connector";
	startPoint: ControlPointData = new BoardPoint(0, 0);
	endPoint: ControlPointData = new BoardPoint(0, 0);
	startPointerStyle: ConnectorPointerStyle = "None";
	endPointerStyle: ConnectorPointerStyle = "ArrowThin";
	lineStyle: ConnectorLineStyle = "straight";
	lineColor = "";
	lineWidth: ConnectionLineWidth = 1;
	transformation = new DefaultTransformationData();
	text = new DefaultRichTextData([], "center", undefined);
	optionalFindItemFn?: FindItemFn;
}

interface SetStartPoint {
	class: "Connector";
	method: "setStartPoint";
	item: string[];
	startPointData: ControlPointData;
	timestamp?: number;
}

interface SetEndPoint {
	class: "Connector";
	method: "setEndPoint";
	item: string[];
	endPointData: ControlPointData;
	timestamp?: number;
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

interface SwitchPointers {
	class: "Connector";
	method: "switchPointers";
	item: string[];
}

export type ConnectorOperation =
	| SetStartPoint
	| SetEndPoint
	| SetStartPointerStyle
	| SetEndPointerStyle
	| SetLineStyle
	| SetLineColor
	| SetLineWidth
	| SwitchPointers;
