import { BoardPoint, ControlPointData, FindItemFn } from "./ControlPoint";
import { ConnectionLineWidth, ConnectorLineStyle, CONNECTOR_COLOR } from "./ConnectorTypes";
import { ConnectorPointerStyle } from "./Pointers/Pointers";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { LinkTo } from "../LinkTo/LinkTo";
import { BorderStyle } from "../Path";
import { ColorValue, fixedColor } from "Color";

export class ConnectorData {
	readonly itemType = "Connector";
	startPoint: ControlPointData = new BoardPoint(0, 0);
	endPoint: ControlPointData = new BoardPoint(0, 0);
	middlePoint: ControlPointData | null = null;
	startPointerStyle: ConnectorPointerStyle = "None";
	endPointerStyle: ConnectorPointerStyle = "ArrowThin";
	lineStyle: ConnectorLineStyle = "straight";
	lineColor: ColorValue = fixedColor(CONNECTOR_COLOR);
	linkTo?: string;
	lineWidth: ConnectionLineWidth = 1;
	borderStyle: BorderStyle = "solid";
	smartJump: boolean = true;
	transformation = new DefaultTransformationData();
	text = new DefaultRichTextData([], "center", undefined);
	optionalFindItemFn?: FindItemFn;
	[key: string]: unknown;
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

interface SetMiddlePoint {
	class: "Connector";
	method: "setMiddlePoint";
	item: string[];
	middlePointData: ControlPointData | null;
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

interface SetBorderStyle {
	class: "Connector";
	method: "setBorderStyle";
	item: string[];
	borderStyle: BorderStyle;
}

interface SetLineColor {
	class: "Connector";
	method: "setLineColor";
	item: string[];
	lineColor: ColorValue;
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

interface SetSmartJump {
	class: "Connector";
	method: "setSmartJump";
	item: string[];
	smartJump: boolean;
}

export type ConnectorOperation =
	| SetStartPoint
	| SetEndPoint
	| SetMiddlePoint
	| SetStartPointerStyle
	| SetEndPointerStyle
	| SetLineStyle
	| SetLineColor
	| SetLineWidth
	| SwitchPointers
	| SetBorderStyle
	| SetSmartJump;
