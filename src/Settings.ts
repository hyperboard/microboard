import { BoardSnapshot } from "./Board";

export const SELECTION_COLOR = "rgb(71, 120, 245)";
export const SELECTION_LOCKED_COLOR = "#0B0C0E";
export const SELECTION_BACKGROUND = "none";
export const SELECTION_ANCHOR_COLOR = "rgb(255, 255, 255)";
export const SELECTION_ANCHOR_RADIUS = 5;
export const SELECTION_ANCHOR_WIDTH = 1;
export const EXPORT_BLUR_BACKGROUND_COLOR = "rgba(0, 0, 0, 0.2)";
export const EXPORT_BACKGROUND_BLUR = 3;
export const EXPORT_SELECTION_BOX_WIDTH = 440;
export const EXPORT_SELECTION_BOX_HEIGHT = 440;
export const EXPORT_MIN_WIDTH = 200;
export const EXPORT_MIN_HEIGHT = 200;
const EXPORT_LINE_WIDTH = 2;
const EXPORT_DECORATION_COLOR = "black";
const EXPORT_DECORATION_SIZE = 12;

export const EXPORT_FRAME_DECORATIONS: ExportFrameDecorationRecord = {
	"top-left": {
		path: new Path2D("M13 1H1V13"),
		lineWidth: EXPORT_LINE_WIDTH,
		color: EXPORT_DECORATION_COLOR,
		width: EXPORT_DECORATION_SIZE,
		height: EXPORT_DECORATION_SIZE,
		offsetX: -3,
		offsetY: -3,
	},
	"top-right": {
		path: new Path2D("M0 1H12V13"),
		lineWidth: EXPORT_LINE_WIDTH,
		color: EXPORT_DECORATION_COLOR,
		width: EXPORT_DECORATION_SIZE,
		height: EXPORT_DECORATION_SIZE,
		offsetX: -10,
		offsetY: -3,
	},
	"bottom-left": {
		path: new Path2D("M13 12H1V0"),
		lineWidth: EXPORT_LINE_WIDTH,
		color: EXPORT_DECORATION_COLOR,
		width: EXPORT_DECORATION_SIZE,
		height: EXPORT_DECORATION_SIZE,
		offsetX: -3,
		offsetY: -10,
	},
	"bottom-right": {
		path: new Path2D("M0 12H12V0"),
		lineWidth: EXPORT_LINE_WIDTH,
		color: EXPORT_DECORATION_COLOR,
		width: EXPORT_DECORATION_SIZE,
		height: EXPORT_DECORATION_SIZE,
		offsetX: -10,
		offsetY: -10,
	},
};

export enum ExportQuality {
	HIGH,
	MEDIUM,
	STANDARD,
	LOW,
}

export const ExportResolution = {
	[ExportQuality.HIGH]: 4,
	[ExportQuality.MEDIUM]: 3,
	[ExportQuality.STANDARD]: 2,
	[ExportQuality.LOW]: 1,
};

export interface ExportSnapshotSelection {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

export type ExportFrameDecorationDirection = `${"top" | "bottom"}-${
	| "left"
	| "right"}`;

export type ExportFrameDecoration = {
	path: Path2D;
	color: string;
	width: number;
	height: number;
	lineWidth: number;
	offsetX?: number;
	offsetY?: number;
};

export type ExportFrameDecorationRecord = Record<
	ExportFrameDecorationDirection,
	ExportFrameDecoration
>;
export const TEXT_COLORS = [
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
];

export const TEXT_HIGHLIGHT_COLORS = [
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
];
export const STICKER_COLORS = [
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
];
export const DEFAULT_STICKER_COLOR = STICKER_COLORS[0];
export const STICKER_COLOR_NAMES = [
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
];
export const SHAPE_STROKE_COLORS = [
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
];

export const SHAPE_DEFAULT_STROKE_COLOR = SHAPE_STROKE_COLORS[12];

export const SHAPE_FILL_COLORS = [
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
];
export const PEN_MIN_STROKE_WIDTH = 1;
export const PEN_MAX_STROKE_WIDTH = 12;
export const PEN_STEP_STROKE_WIDTH = 1;
export const PEN_INITIAL_STROKE_WIDTH = 6;
export const HIGHLIGHTER_INITIAL_STROKE_WIDTH = 9;
export const HIGHLIGHTER_MAX_STROKE_WIDTH = 24;
export const ERASER_STROKE_WIDTH = 12;
export const PEN_RENDER_POINTER_CIRCLE = true;
export const PEN_STROKE_STYLE = "solid";
export const PEN_POINTER_CIRCLE_COLOR = "rgb(227, 228, 230)";
export const PEN_SETTINGS_KEY = "drawingSettings";
export const HIGHLIGHTER_SETTINGS_KEY = "highlighterSettings";

export type DrawingTool = "Pen" | "Eraser" | "Highlighter";
export const DRAWING_TOOLS: DrawingTool[] = ["Pen", "Eraser", "Highlighter"];

export const PEN_COLORS = [
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
];

export const HIGHLIGHTER_COLORS = [
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
];

export const PEN_DEFAULT_COLOR = PEN_COLORS[12];
export const HIGHLIGHTER_DEFAULT_COLOR = HIGHLIGHTER_COLORS[10];
export const ERASER_DEFAULT_COLOR = "rgba(222, 224, 227, 0.5)";
export const ERASER_MAX_LINE_LENGTH = 12;
export interface Template {
	uniqId: string;
	preview: string;
	description: string;
	lan: string;
	tags: string[];
	snapshot: BoardSnapshot;
	name: string;
}

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

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
	"Research & Analysis",
	"Diagramming",
	"Meeting & Workshop",
	"Strategy & Planning",
	"Brainstorming",
	"Agile Workflow",
	"Icebreaker & Game",
	"Education",
];

export const TEMPLATE_LANGUAGES: { value: string; label: string }[] = [
	{ value: "ru", label: "Russian" },
	{ value: "en", label: "English" },
	{ value: "de", label: "German" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "zh", label: "Chinese" },
];
export const CANVAS_BG_COLOR = "#f6f6f6";
