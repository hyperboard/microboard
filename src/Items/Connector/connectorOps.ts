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



	switchPointers: (items: Connector[]): ConnectorOperation => ({
		class: "Connector",
		method: "switchPointers",
		item: items.map(i => i.getId()),
	}),


};
