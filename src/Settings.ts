import { DocumentFactory } from "./api/DocumentFactory";
import { Path2DFactory } from "./api/Path2DFactory";
import { BoardSnapshot } from "./Board";

/**
 * Allowed drawing tools.
 */
export type DrawingTool = "Pen" | "Eraser" | "Highlighter";

/**
 * Template categories as a literal union.
 */
export type TemplateCategory =
	| "All templates"
	| "Research & Analysis"
	| "Diagramming"
	| "Meeting & Workshop"
	| "Strategy & Planning"
	| "Brainstorming"
	| "Agile Workflow"
	| "Icebreaker & Game"
	| "Education";

/**
 * Template language definition.
 */
export interface TemplateLanguage {
	value: "ru" | "en" | "de" | "es" | "fr" | "zh";
	label: string;
}

export interface Template {
	uniqId: string;
	preview: string;
	description: string;
	lan: string;
	tags: string[];
	snapshot: BoardSnapshot;
	name: string;
}

export enum ExportQuality {
	HIGH,
	MEDIUM,
	STANDARD,
	LOW,
}

export interface Settings {
	// Factories
	path2DFactory: Path2DFactory;
	documentFactory: DocumentFactory;

	// Selection settings
	SELECTION_COLOR: string;
	SELECTION_LOCKED_COLOR: string;
	SELECTION_BACKGROUND: string;
	SELECTION_ANCHOR_COLOR: string;
	SELECTION_ANCHOR_RADIUS: number;
	SELECTION_ANCHOR_WIDTH: number;

	// Export settings
	EXPORT_BLUR_BACKGROUND_COLOR: string;
	EXPORT_BACKGROUND_BLUR: number;
	EXPORT_SELECTION_BOX_WIDTH: number;
	EXPORT_SELECTION_BOX_HEIGHT: number;
	EXPORT_MIN_WIDTH: number;
	EXPORT_MIN_HEIGHT: number;
	EXPORT_LINE_WIDTH: number;
	EXPORT_DECORATION_COLOR: string;
	EXPORT_DECORATION_SIZE: number;
	EXPORT_FRAME_DECORATIONS: ExportFrameDecorationRecord;

	// Export quality and resolution (fixed keys with numeric values)
	ExportQuality: {
		HIGH: ExportQuality.HIGH;
		MEDIUM: ExportQuality.MEDIUM;
		STANDARD: ExportQuality.STANDARD;
		LOW: ExportQuality.LOW;
	};
	ExportResolution: {
		[ExportQuality.HIGH]: number;
		[ExportQuality.MEDIUM]: number;
		[ExportQuality.STANDARD]: number;
		[ExportQuality.LOW]: number;
	};

	// Color settings
	TEXT_COLORS: string[];
	TEXT_HIGHLIGHT_COLORS: string[];
	STICKER_COLORS: string[];
	DEFAULT_STICKER_COLOR: string;
	STICKER_COLOR_NAMES: string[];
	SHAPE_STROKE_COLORS: string[];
	SHAPE_DEFAULT_STROKE_COLOR: string;
	SHAPE_FILL_COLORS: string[];

	// Pen, highlighter, eraser settings
	PEN_MIN_STROKE_WIDTH: number;
	PEN_MAX_STROKE_WIDTH: number;
	PEN_STEP_STROKE_WIDTH: number;
	PEN_INITIAL_STROKE_WIDTH: number;
	HIGHLIGHTER_INITIAL_STROKE_WIDTH: number;
	HIGHLIGHTER_MAX_STROKE_WIDTH: number;
	ERASER_STROKE_WIDTH: number;
	PEN_RENDER_POINTER_CIRCLE: boolean;
	PEN_STROKE_STYLE: "solid";
	PEN_POINTER_CIRCLE_COLOR: string;
	PEN_SETTINGS_KEY: string;
	HIGHLIGHTER_SETTINGS_KEY: string;

	// Tools and their colors
	DRAWING_TOOLS: DrawingTool[];
	PEN_COLORS: string[];
	HIGHLIGHTER_COLORS: string[];
	PEN_DEFAULT_COLOR: string;
	HIGHLIGHTER_DEFAULT_COLOR: string;
	ERASER_DEFAULT_COLOR: string;
	ERASER_MAX_LINE_LENGTH: number;

	// Template settings
	TEMPLATE_CATEGORIES: TemplateCategory[];
	TEMPLATE_LANGUAGES: TemplateLanguage[];

	// Canvas background
	CANVAS_BG_COLOR: string;
}

/**
 * Set properties before using the board.
 * @property {Path2DFactory} - The factory for creating Path2D objects.
 * @property {DocumentFactory} - The factory for creating document elements.
 */
export const SETTINGS: Settings = {
	path2DFactory: undefined as unknown as Path2DFactory,
	documentFactory: undefined as unknown as DocumentFactory,

	SELECTION_COLOR: "rgb(71, 120, 245)",
	SELECTION_LOCKED_COLOR: "#0B0C0E",
	SELECTION_BACKGROUND: "none",
	SELECTION_ANCHOR_COLOR: "rgb(255, 255, 255)",
	SELECTION_ANCHOR_RADIUS: 5,
	SELECTION_ANCHOR_WIDTH: 1,
	EXPORT_BLUR_BACKGROUND_COLOR: "rgba(0, 0, 0, 0.2)",
	EXPORT_BACKGROUND_BLUR: 3,
	EXPORT_SELECTION_BOX_WIDTH: 440,
	EXPORT_SELECTION_BOX_HEIGHT: 440,
	EXPORT_MIN_WIDTH: 200,
	EXPORT_MIN_HEIGHT: 200,
	EXPORT_LINE_WIDTH: 2,
	EXPORT_DECORATION_COLOR: "black",
	EXPORT_DECORATION_SIZE: 12,
	EXPORT_FRAME_DECORATIONS:
		undefined as unknown as ExportFrameDecorationRecord,
	ExportQuality: {
		HIGH: 0,
		MEDIUM: 1,
		STANDARD: 2,
		LOW: 3,
	} as const,
	ExportResolution: {
		[ExportQuality.HIGH]: 4,
		[ExportQuality.MEDIUM]: 3,
		[ExportQuality.STANDARD]: 2,
		[ExportQuality.LOW]: 1,
	} as const,
	TEXT_COLORS: [
		"rgb(255, 255, 255)",
		"rgb(254, 244, 69)",
		"rgb(255, 177, 60)",
		"rgb(230, 72, 61)",
		"rgb(204, 208, 213)",
		"rgb(204, 241, 0)",
		"rgb(140, 236, 0)",
		"rgb(218, 0, 99)",
		"rgb(113, 118, 132)",
		"rgb(18, 205, 212)",
		"rgb(0, 158, 41)",
		"rgb(149, 16, 172)",
		"rgb(20, 21, 26)",
		"rgb(71, 120, 245)",
		"rgb(29, 84, 226)",
		"rgb(115, 29, 226)",
	],
	TEXT_HIGHLIGHT_COLORS: [
		"none",
		"rgb(255, 255, 255)",
		"rgb(254, 244, 69)",
		"rgb(255, 177, 60)",
		"rgb(230, 72, 61)",
		"rgb(204, 208, 213)",
		"rgb(204, 241, 0)",
		"rgb(140, 236, 0)",
		"rgb(218, 0, 99)",
		"rgb(113, 118, 132)",
		"rgb(18, 205, 212)",
		"rgb(0, 158, 41)",
		"rgb(149, 16, 172)",
		"rgb(20, 21, 26)",
		"rgb(71, 120, 245)",
		"rgb(29, 84, 226)",
		"rgb(115, 29, 226)",
	],
	STICKER_COLORS: [
		"rgb(233, 208, 255)",
		"rgb(255, 209, 211)",
		"rgb(206, 228, 255)",
		"rgb(205, 250, 255)",
		"rgb(203, 232, 150)",
		"rgb(180, 241, 198)",
		"rgb(255, 180, 126)",
		"rgb(255, 235, 163)",
		"rgb(231, 232, 238)",
		"rgb(156, 156, 156)",
	],
	DEFAULT_STICKER_COLOR: "rgb(233, 208, 255)",
	STICKER_COLOR_NAMES: [
		"purple",
		"pink",
		"sky-blue",
		"blue",
		"green",
		"light-green",
		"orange",
		"yellow",
		"light-gray",
		"gray",
	],
	SHAPE_STROKE_COLORS: [
		"rgb(255, 255, 255)",
		"rgb(254, 244, 69)",
		"rgb(255, 177, 60)",
		"rgb(230, 72, 61)",
		"rgb(204, 208, 213)",
		"rgb(204, 241, 0)",
		"rgb(140, 236, 0)",
		"rgb(218, 0, 99)",
		"rgb(113, 118, 132)",
		"rgb(18, 205, 212)",
		"rgb(0, 158, 41)",
		"rgb(149, 16, 172)",
		"rgb(20, 21, 26)",
		"rgb(71, 120, 245)",
		"rgb(29, 84, 226)",
		"rgb(115, 29, 226)",
	],
	SHAPE_DEFAULT_STROKE_COLOR: "rgb(20, 21, 26)",
	SHAPE_FILL_COLORS: [
		"none",
		"rgb(255, 255, 255)",
		"rgb(254, 244, 69)",
		"rgb(255, 177, 60)",
		"rgb(230, 72, 61)",
		"rgb(204, 208, 213)",
		"rgb(204, 241, 0)",
		"rgb(140, 236, 0)",
		"rgb(218, 0, 99)",
		"rgb(113, 118, 132)",
		"rgb(18, 205, 212)",
		"rgb(0, 158, 41)",
		"rgb(149, 16, 172)",
		"rgb(20, 21, 26)",
		"rgb(71, 120, 245)",
		"rgb(29, 84, 226)",
		"rgb(115, 29, 226)",
	],
	PEN_MIN_STROKE_WIDTH: 1,
	PEN_MAX_STROKE_WIDTH: 12,
	PEN_STEP_STROKE_WIDTH: 1,
	PEN_INITIAL_STROKE_WIDTH: 6,
	HIGHLIGHTER_INITIAL_STROKE_WIDTH: 9,
	HIGHLIGHTER_MAX_STROKE_WIDTH: 24,
	ERASER_STROKE_WIDTH: 12,
	PEN_RENDER_POINTER_CIRCLE: true,
	PEN_STROKE_STYLE: "solid",
	PEN_POINTER_CIRCLE_COLOR: "rgb(227, 228, 230)",
	PEN_SETTINGS_KEY: "drawingSettings",
	HIGHLIGHTER_SETTINGS_KEY: "highlighterSettings",
	DRAWING_TOOLS: ["Pen", "Eraser", "Highlighter"],
	PEN_COLORS: [
		"rgb(255, 255, 255)",
		"rgb(254, 244, 69)",
		"rgb(255, 177, 60)",
		"rgb(230, 72, 61)",
		"rgb(204, 208, 213)",
		"rgb(204, 241, 0)",
		"rgb(140, 236, 0)",
		"rgb(218, 0, 99)",
		"rgb(113, 118, 132)",
		"rgb(18, 205, 212)",
		"rgb(0, 158, 41)",
		"rgb(149, 16, 172)",
		"rgb(20, 21, 26)",
		"rgb(71, 120, 245)",
		"rgb(29, 84, 226)",
		"rgb(115, 29, 226)",
	],
	HIGHLIGHTER_COLORS: [
		"rgba(255, 255, 255, 0.5)",
		"rgba(254, 244, 69, 0.5)",
		"rgba(255, 177, 60, 0.5)",
		"rgba(230, 72, 61, 0.5)",
		"rgba(204, 208, 213, 0.5)",
		"rgba(204, 241, 0, 0.5)",
		"rgba(140, 236, 0, 0.5)",
		"rgba(218, 0, 99, 0.5)",
		"rgba(113, 118, 132, 0.5)",
		"rgba(18, 205, 212, 0.5)",
		"rgba(0, 158, 41, 0.5)",
		"rgba(149, 16, 172, 0.5)",
		"rgba(20, 21, 26, 0.5)",
		"rgba(71, 120, 245, 0.5)",
		"rgba(29, 84, 226, 0.5)",
		"rgba(115, 29, 226, 0.5)",
	],
	PEN_DEFAULT_COLOR: "rgb(20, 21, 26)",
	HIGHLIGHTER_DEFAULT_COLOR: "rgba(0, 158, 41, 0.5)",
	ERASER_DEFAULT_COLOR: "rgba(222, 224, 227, 0.5)",
	ERASER_MAX_LINE_LENGTH: 12,
	TEMPLATE_CATEGORIES: [
		"Research & Analysis",
		"Diagramming",
		"Meeting & Workshop",
		"Strategy & Planning",
		"Brainstorming",
		"Agile Workflow",
		"Icebreaker & Game",
		"Education",
	],
	TEMPLATE_LANGUAGES: [
		{ value: "ru", label: "Russian" },
		{ value: "en", label: "English" },
		{ value: "de", label: "German" },
		{ value: "es", label: "Spanish" },
		{ value: "fr", label: "French" },
		{ value: "zh", label: "Chinese" },
	],
	CANVAS_BG_COLOR: "#f6f6f6",
};

export interface ExportSnapshotSelection {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

type ExportFrameDecorationDirection = `${"top" | "bottom"}-${"left" | "right"}`;

type ExportFrameDecoration = {
	path: Path2DFactory;
	color: string;
	width: number;
	height: number;
	lineWidth: number;
	offsetX?: number;
	offsetY?: number;
};

type ExportFrameDecorationRecord = Record<
	ExportFrameDecorationDirection,
	ExportFrameDecoration
>;
