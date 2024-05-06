import {
	RichTextOperation,
	TransformationOperation,
	ConnectorOperation,
} from "Board/Items";
import { Path } from "slate";
import { Operation } from "./EventsOperations";

// TODO API Conditional to Map
export function canNotBeMerged(op: Operation): boolean {
	if (op.class === "Transformation") {
		return false;
	}
	if (op.class === "RichText" && op.method === "edit") {
		return false;
	}
	if (
		op.class === "Connector" &&
		(op.method === "setStartPoint" || op.method === "setEndPoint")
	) {
		return false;
	}
	return true;
}

export function mergeOperations(
	opA: Operation,
	opB: Operation,
): Operation | undefined {
	if (opA.class !== opB.class) {
		return;
	}
	if (opA.method !== opB.method) {
		return;
	}
	if (opA.class === "Transformation" && opB.class === "Transformation") {
		return mergeTransformationOperations(opA, opB);
	}
	if (opA.class === "RichText" && opB.class === "RichText") {
		return mergeRichTextOperations(opA, opB);
	}
	if (opA.class === "Connector" && opB.class === "Connector") {
		return mergeConnectorOperations(opA, opB);
	}
	return;
}

function areItemsTheSame(opA: Operation, opB: Operation): boolean {
	if (!(Array.isArray(opA.item) && Array.isArray(opB.item))) {
		return false;
	}
	if (opA.item.length !== opB.item.length) {
		return false;
	}
	for (let i = 0; i < opA.item.length; i++) {
		if (opA.item[i] !== opB.item[i]) {
			return false;
		}
	}
	return true;
}

function mergeTransformationOperations(
	opA: TransformationOperation,
	opB: TransformationOperation,
): TransformationOperation | undefined {
	if (!areItemsTheSame(opA, opB)) {
		return;
	}
	const method = opA.method;
	switch (method) {
		case "translateBy":
			return {
				class: "Transformation",
				method: "translateBy",
				item: opA.item,
				x: opA.x + opB.x,
				y: opA.y + opB.y,
			};
		case "scaleBy":
			return {
				class: "Transformation",
				method: "scaleBy",
				item: opA.item,
				x: opA.x * opB.x,
				y: opA.y * opB.y,
			};
		case "rotateBy":
			return {
				class: "Transformation",
				method: "rotateBy",
				item: opA.item,
				degree: opA.degree + opB.degree,
			};
		case "scaleByTranslateBy":
			return {
				class: "Transformation",
				method: "scaleByTranslateBy",
				item: opA.item,
				scale: {
					x: opA.scale.x * opB.scale.x,
					y: opA.scale.y * opB.scale.y,
				},
				translate: {
					x: opA.translate.x + opB.translate.x,
					y: opA.translate.y + opB.translate.y,
				},
			};
		default:
			return;
	}
}

function mergeRichTextOperations(
	opA: RichTextOperation,
	opB: RichTextOperation,
): RichTextOperation | undefined {
	if (!areItemsTheSame(opA, opB)) {
		return;
	}

	/*
    if (opA.method !== opB.method) {
        return;
    }
    const method = opA.method;
    if (method !== "edit") {}
    */
	if (opA.method !== "edit" || opB.method !== "edit") {
		return;
	}
	if (opA.ops.length !== 1 && opB.ops.length !== 1) {
		return;
	}

	const A = opA.ops[0];
	const B = opB.ops[0];

	if (
		B.type === "insert_text" &&
		A.type === "insert_text" &&
		B.offset === A.offset + A.text.length &&
		Path.equals(B.path, A.path)
	) {
		return {
			...opB,
			ops: [
				{
					...B,
					offset: A.offset,
					text: A.text + B.text,
				},
			],
		};
	}

	if (
		B.type === "remove_text" &&
		A.type === "remove_text" &&
		B.offset + B.text.length === A.offset &&
		Path.equals(B.path, A.path)
	) {
		return {
			...opB,
			ops: [
				{
					...B,
					offset: B.offset,
					text: B.text + A.text,
				},
			],
		};
	}

	return;
}

function mergeConnectorOperations(
	opA: ConnectorOperation,
	opB: ConnectorOperation,
): ConnectorOperation | undefined {
	if (!areItemsTheSame(opA, opB)) {
		return;
	}
	if (opA.method === "setStartPoint" && opB.method === "setStartPoint") {
		return {
			...opB,
		};
	}

	if (opA.method === "setEndPoint" && opB.method === "setEndPoint") {
		return {
			...opB,
		};
	}

	return;
}
