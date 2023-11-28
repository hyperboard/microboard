import { Connector } from ".";
import { Command } from "../../Events";
import { ConnectorOperation } from "./ConnectorOperations";

export class ConnectorCommand implements Command {
	reverse = this.getReverse();

	constructor(
		private connector: Connector[],
		private operation: ConnectorOperation,
	) {}

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

	getReverse(): { item: Connector; operation: ConnectorOperation }[] {
		const reverse = [];
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
		}
		return reverse;
	}
}
