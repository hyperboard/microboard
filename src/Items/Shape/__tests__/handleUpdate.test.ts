import { handleUpdate } from "../handleUpdate";
import { TransformationOperation } from "../../Transformation";

describe("handleUpdate function", () => {
	let mockText: {
		getId: jest.Mock;
		transformCanvas: jest.Mock;
		handleInshapeScale: jest.Mock;
		updateElement: jest.Mock;
	};

	beforeEach(() => {
		// Create mock with all required methods
		mockText = {
			getId: jest.fn().mockReturnValue("text-123"),
			transformCanvas: jest.fn(),
			handleInshapeScale: jest.fn(),
			updateElement: jest.fn(),
		};
	});

	test("should call transformCanvas for translateTo operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "translateTo",
			item: ["text-123"],
			x: 10,
			y: 20,
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).toHaveBeenCalledTimes(1);
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call transformCanvas for translateBy operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "translateBy",
			item: ["text-123"],
			x: 10,
			y: 20,
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).toHaveBeenCalledTimes(1);
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call transformCanvas for transformMany with translateTo operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "translateTo",
					item: ["text-123"],
					x: 10,
					y: 20,
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).toHaveBeenCalledTimes(1);
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call transformCanvas for transformMany with translateBy operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "translateBy",
					item: ["text-123"],
					x: 10,
					y: 20,
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).toHaveBeenCalledTimes(1);
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call transformCanvas for transformMany with scaleByTranslateBy operation and scale 1,1", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "scaleByTranslateBy",
					item: ["text-123"],
					translate: { x: 10, y: 20 },
					scale: { x: 1, y: 1 } /*  */,
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).toHaveBeenCalledTimes(1);
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call updateElement for transformMany with scaleByTranslateBy operation and scale 1.5,1.5", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "scaleByTranslateBy",
					item: ["text-123"],
					translate: { x: 10, y: 20 },
					scale: { x: 1.5, y: 1.5 },
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).toHaveBeenCalledTimes(1);
	});

	test("should call updateElement for transformMany with scaleByTranslateBy operation and any uniform scale != 1", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "scaleByTranslateBy",
					item: ["text-123"],
					translate: { x: 10, y: 20 },
					scale: { x: 2.5, y: 2.5 },
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).toHaveBeenCalledTimes(1);
	});

	test("should call handleInshapeScale for transformMany with scaleByTranslateBy operation and scale not 1,1", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "transformMany",
			items: {
				"text-123": {
					class: "Transformation",
					method: "scaleByTranslateBy",
					item: ["text-123"],
					translate: { x: 10, y: 20 },
					scale: { x: 1.5, y: 2 },
				},
			},
		};

		handleUpdate(op, mockText);

		expect(mockText.getId).toHaveBeenCalledTimes(1);
		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).toHaveBeenCalledTimes(1);
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call handleInshapeScale for scaleByTranslateBy operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: ["text-123"],
			translate: { x: 10, y: 20 },
			scale: { x: 1.5, y: 2 },
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).toHaveBeenCalledTimes(1);
		expect(mockText.updateElement).not.toHaveBeenCalled();
	});

	test("should call updateElement for scaleBy operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "scaleBy",
			item: ["text-123"],
			x: 1.5,
			y: 2,
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).toHaveBeenCalledTimes(1);
	});

	test("should call updateElement for scaleTo operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "scaleTo",
			item: ["text-123"],
			x: 1.5,
			y: 2,
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).toHaveBeenCalledTimes(1);
	});

	test("should call updateElement for rotateBy operation", () => {
		const op: TransformationOperation = {
			class: "Transformation",
			method: "rotateBy",
			item: ["text-123"],
			degree: 45,
		};

		handleUpdate(op, mockText);

		expect(mockText.transformCanvas).not.toHaveBeenCalled();
		expect(mockText.handleInshapeScale).not.toHaveBeenCalled();
		expect(mockText.updateElement).toHaveBeenCalledTimes(1);
	});
});
