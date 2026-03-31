import { ColorValue } from "Color";
import { BorderStyle } from "../Path";
import { Connector } from "./Connector";
import { ControlPoint, ControlPointData } from "./ControlPoint";
import { ConnectorOperation } from "./ConnectorOperations";
import { ConnectionLineWidth, ConnectorLineStyle } from "./ConnectorTypes";
import { ConnectorPointerStyle } from "./Pointers/Pointers";

export const connectorOps = {
	setStartPoint: (
		items: Connector[],
		point: ControlPoint | ControlPointData,
		timestamp?: number
	): ConnectorOperation => ({
		class: "Connector",
		method: "setStartPoint",
		item: items.map(i => i.getId()),
		startPointData: "serialize" in point ? point.serialize() : point,
		timestamp,
	}),

	setEndPoint: (
		items: Connector[],
		point: ControlPoint | ControlPointData,
		timestamp?: number
	): ConnectorOperation => ({
		class: "Connector",
		method: "setEndPoint",
		item: items.map(i => i.getId()),
		endPointData: "serialize" in point ? point.serialize() : point,
		timestamp,
	}),

	setMiddlePoint: (
		items: Connector[],
		point: ControlPoint | ControlPointData | null,
		timestamp?: number
	): ConnectorOperation => ({
		class: "Connector",
		method: "setMiddlePoint",
		item: items.map(i => i.getId()),
		middlePointData:
			point && "serialize" in point ? point.serialize() : (point as ControlPointData | null),
		timestamp,
	}),

	setStartPointerStyle: (
		items: Connector[],
		style: ConnectorPointerStyle
	): ConnectorOperation => ({
		class: "Connector",
		method: "setStartPointerStyle",
		item: items.map(i => i.getId()),
		startPointerStyle: style,
	}),

	setEndPointerStyle: (
		items: Connector[],
		style: ConnectorPointerStyle
	): ConnectorOperation => ({
		class: "Connector",
		method: "setEndPointerStyle",
		item: items.map(i => i.getId()),
		endPointerStyle: style,
	}),

	setLineStyle: (items: Connector[], style: ConnectorLineStyle): ConnectorOperation => ({
		class: "Connector",
		method: "setLineStyle",
		item: items.map(i => i.getId()),
		lineStyle: style,
	}),

	setBorderStyle: (items: Connector[], borderStyle: BorderStyle): ConnectorOperation => ({
		class: "Connector",
		method: "setBorderStyle",
		item: items.map(i => i.getId()),
		borderStyle,
	}),

	setLineColor: (items: Connector[], color: ColorValue): ConnectorOperation => ({
		class: "Connector",
		method: "setLineColor",
		item: items.map(i => i.getId()),
		lineColor: color,
	}),

	setLineWidth: (items: Connector[], width: ConnectionLineWidth): ConnectorOperation => ({
		class: "Connector",
		method: "setLineWidth",
		item: items.map(i => i.getId()),
		lineWidth: width,
	}),

	switchPointers: (items: Connector[]): ConnectorOperation => ({
		class: "Connector",
		method: "switchPointers",
		item: items.map(i => i.getId()),
	}),

	setSmartJump: (items: Connector[], smartJump: boolean): ConnectorOperation => ({
		class: "Connector",
		method: "setSmartJump",
		item: items.map(i => i.getId()),
		smartJump,
	}),
};
