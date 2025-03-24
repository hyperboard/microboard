import { Connector } from ".";
import { Command } from "../../Events";
import { ConnectorOperation } from "./ConnectorOperations";

type ReverseOperation = { item: Connector; operation: ConnectorOperation }[];

export class ConnectorCommand implements Command {
	reverse: ReverseOperation;

	constructor(
		private connector: Connector[],
		private operation: ConnectorOperation,
	) {
		this.reverse = this.getReverse();
	}

	merge(op: ConnectorOperation): this {
		this.operation = op;
		return this;
	}

	apply(): void {
		for (const connector of this.connector) {
			connector.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): ReverseOperation {
		const reverse: ReverseOperation = [];
		switch (this.operation.method) {
			case "setStartPoint":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							startPointData: connector
								.getStartPoint()
								.serialize(),
						},
					});
				}
				break;
			case "setEndPoint":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							endPointData: connector.getEndPoint().serialize(),
						},
					});
				}
				break;
			case "setMiddlePoint":
				for (const connector of this.connector) {
					const middlePoint = connector.getMiddlePoints();
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							middlePointData: middlePoint
								? middlePoint.serialize()
								: null,
						},
					});
				}
				break;
			case "setStartPointerStyle":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							startPointerStyle: connector.getStartPointerStyle(),
						},
					});
				}
				break;
			case "setEndPointerStyle":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							endPointerStyle: connector.getEndPointerStyle(),
						},
					});
				}
				break;
			case "setLineStyle":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							lineStyle: connector.getLineStyle(),
						},
					});
				}
				break;
			case "setBorderStyle":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							borderStyle: connector.getBorderStyle(),
						},
					});
				}
				break;
			case "setLineWidth":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							lineWidth: connector.getLineWidth(),
						},
					});
				}
				break;
			case "setLineColor":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: {
							...this.operation,
							lineColor: connector.getLineColor(),
						},
					});
				}
				break;
			case "switchPointers":
				for (const connector of this.connector) {
					reverse.push({
						item: connector,
						operation: this.operation,
					});
				}
				break;
		}
		return reverse;
	}
}
