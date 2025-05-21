import { BoardEvent } from "./Events";
import { transfromOperation } from "./Transform";

export function transformEvents(
	confirmed: BoardEvent[],
	toTransform: BoardEvent[],
): BoardEvent[] {
	const transformed: BoardEvent[] = [];

	for (const transf of toTransform) {
		let actualyTransformed = { ...transf };

		for (const conf of confirmed) {
			const { operation: confOp } = conf.body;
			const { operation: transfOp } = actualyTransformed.body;

			// const transformedOp = transfromOperation(confOp, transfOp, board);
			const transformedOp = transfromOperation(confOp, transfOp);
			if (transformedOp) {
				actualyTransformed = {
					...actualyTransformed,
					body: {
						...actualyTransformed.body,
						operation: transformedOp,
					},
				};
			}
		}
		transformed.push(actualyTransformed);
	}

	return transformed;
}
