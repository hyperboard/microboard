import { Point } from "./Point";

export class GeometricNormal {
	private distanceValue: number | undefined;
	private angleRadiansValue: number | undefined;
	private angelRadiansNormalValue: number | undefined;

	constructor(
		readonly point: Point,
		readonly projectionPoint: Point,
		readonly normalPoint: Point,
	) {}

	getDistance(): number {
		if (this.distanceValue === undefined) {
			this.distanceValue = this.point.getDistance(this.projectionPoint);
		}
		return this.distanceValue;
	}

	getAngleRadians(): number {
		if (this.angleRadiansValue === undefined) {
			const projectionPoint = this.projectionPoint;
			const point = this.point;
			const dy = projectionPoint.y - point.y;
			const dx = projectionPoint.x - point.x;
			this.angleRadiansValue = Math.atan2(dy, dx);
		}
		return this.angleRadiansValue;
	}

	getAngleRadiansNormal(): number {
		if (this.angelRadiansNormalValue === undefined) {
			this.angelRadiansNormalValue = Math.atan2(
				this.normalPoint.y,
				this.normalPoint.x,
			);
		}
		return this.angelRadiansNormalValue;
	}
}
