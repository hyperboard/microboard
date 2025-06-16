import { DocumentFactory } from "./api/DocumentFactory";
import { Path2DFactory } from "./api/Path2DFactory";
import { BoardSnapshot } from "./Board";
import { BrowserDocumentFactory } from "./api/BrowserDocumentFactory";
import { BrowserPath2D } from "./api/BrowserPath2DFactory";
import { MockDocumentFactory } from "./api/MockDocumentFactory";

export interface Connection {
  connectionId: number;
  getCurrentUser: () => string;
  connect(): Promise<void>;
  subscribe(board: any): void;
  unsubscribe(board: any): void;

  publishPresenceEvent(boardId: string, event: any): void;
  publishAuth(): Promise<void>;
  publishLogout(): void;

  onMessage?: (msg: any) => void;
  onAccessDenied: (boardId: string, forceUpdate?: boolean) => void;
  notifyAboutLostConnection: () => void;
  dismissNotificationAboutLostConnection: () => void;
  resetConnection: () => void;
  send: (msg: any) => void;
}

// Define minimal interface for i18next that we need
export interface I18NextInterface {
  t: (key: string, options?: any) => string;
  changeLanguage: (
    lng: string,
    callback?: (err: any, t: any) => void
  ) => Promise<any>;
  // Add other methods you need from i18next
}

export interface NotifyFunction {
  (options: {
    header: string;
    body: string;
    variant?: "info" | "success" | "warning" | "error";
    duration?: number;
    button?: { text: string; onClick: () => void };
    loader?: "loader" | "MediaLoader";
  }): string; // Returns notification id
}
import { MockPath2D } from "api/MockPath2D";
import { cursorsMap } from "Pointer/Pointer";

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

interface ExportFrameDecorationDirection {
  direction: `${"top" | "bottom"}-${"left" | "right"}`;
}

interface ExportFrameDecoration {
  path: Path2DFactory;
  color: string;
  width: number;
  height: number;
  lineWidth: number;
  offsetX?: number;
  offsetY?: number;
}

type ExportFrameDecorationRecord = Record<
  `${"top" | "bottom"}-${"left" | "right"}`,
  ExportFrameDecoration
>;

export type DefaultTextStyles = {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontHighlight: string;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  "line-through": boolean;
  overline: boolean;
  subscript: boolean;
  superscript: boolean;
};

export interface ExportSnapshotSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

type OpenModalFunction = (modalId: string) => void;
type NotifyWrapperFunction = NotifyFunction;
type DisMissNotificationFunction = (toastId?: string) => void;
type IsNodeFunction = () => boolean;
type GetDocumentWidthFunction = () => number;
type GetDocumentHeightFunction = () => number;
type GetDPIFunction = () => number;
type GetYouTubeIdFunction = (url?: string) => string | null;
type GetDOMParser = () => {
  parseFromString: (str: string, type: DOMParserSupportedType) => Document;
};
type ReactEditorFocus = (editor: any) => void;
type ReactEditorToSlatePoint = (
  editor: any,
  domNode: Node,
  offset: number,
  options: any
) => any;

/**
 * Set properties before using the board.
 * @property {Path2DFactory} - The factory for creating Path2D objects.
 * @property {DocumentFactory} - The factory for creating document elements.
 */
export const conf = {
  connection: undefined as unknown as Connection,

  // Factories
  path2DFactory: typeof Path2D !== "undefined" ? BrowserPath2D : MockPath2D,

  documentFactory:
    typeof document !== "undefined"
      ? new BrowserDocumentFactory()
      : new MockDocumentFactory(),

  getDOMParser: undefined as unknown as GetDOMParser,

  measureCtx: undefined as unknown as CanvasRenderingContext2D,

  // Internationalization
  i18n: {} as unknown as I18NextInterface,

  openModal: (() => {}) as OpenModalFunction,
  notify: (() => "") as NotifyWrapperFunction,
  disMissNotification: (() => {}) as DisMissNotificationFunction,
  isNode: (() => typeof window === "undefined") as IsNodeFunction,
  getDocumentWidth: (() => 800) as GetDocumentWidthFunction,
  getDocumentHeight: (() => 600) as GetDocumentHeightFunction,
  getDPI: (() => 1) as GetDPIFunction,

  reactEditorFocus: (() => {}) as ReactEditorFocus,
  reactEditorToSlatePoint: (() => null) as ReactEditorToSlatePoint,

  planNames: {
    basic: "Basic",
    plus: "Plus",
    plusAI: "PlusAI",
  },
  EVENTS_PUBLISH_INTERVAL: 100, // 100 ms (10 times per second)
  EVENTS_RESEND_INTERVAL: 1000, // 1 second

  // Selection settings
  SELECTION_COLOR: "rgb(71, 120, 245)",
  SELECTION_LOCKED_COLOR: "#0B0C0E",
  SELECTION_BACKGROUND: "none",
  SELECTION_ANCHOR_COLOR: "rgb(255, 255, 255)",
  SELECTION_ANCHOR_RADIUS: 5,
  SELECTION_ANCHOR_WIDTH: 1,

  // Export settings
  EXPORT_BLUR_BACKGROUND_COLOR: "rgba(0, 0, 0, 0.2)",
  EXPORT_BACKGROUND_BLUR: 3,
  EXPORT_SELECTION_BOX_WIDTH: 440,
  EXPORT_SELECTION_BOX_HEIGHT: 440,
  EXPORT_MIN_WIDTH: 200,
  EXPORT_MIN_HEIGHT: 200,
  EXPORT_LINE_WIDTH: 2,
  EXPORT_DECORATION_COLOR: "black",
  EXPORT_DECORATION_SIZE: 12,
  EXPORT_FRAME_DECORATIONS: undefined as unknown as ExportFrameDecorationRecord,
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

  // Color settings
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

  // Template settings
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
  URL_REGEX: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
  AI_NODE_DEFAULT_NODE_WIDTH: 640,
  NAVIGATION_STEP: 5,

  getYouTubeId: ((url?: string) => {
    if (!url) {
      return null;
    }
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }) as GetYouTubeIdFunction,

  AUDIO_DIMENSIONS: { width: 368, height: 76 },
  AUDIO_FORMATS: ["aac", "mp3", "wav"],
  AUDIO_MIME_TYPES: ["audio/mpeg", "audio/wav", "audio/aac", "audio/mp3"],
  VIDEO_FORMATS: ["mp4", "webm", "mov"],
  VIDEO_MIME_TYPES: ["video/mp4", "video/webm", "video/quicktime"],

  LINK_BTN_SIZE: 24,
  LINK_BTN_OFFSET: 2,

  LISTMARK_NUMBERS: [
    "1.",
    "2.",
    "3.",
    "4.",
    "5.",
    "6.",
    "7.",
    "8.",
    "9.",
    "10.",
    "11.",
    "12.",
    "13.",
    "14.",
    "15.",
    "16.",
    "17.",
    "18.",
    "19.",
    "20.",
  ],
  LISTMARK_LETTERS: [
    "a.",
    "b.",
    "c.",
    "d.",
    "e.",
    "f.",
    "g.",
    "h.",
    "i.",
    "j.",
    "k.",
    "l.",
    "m.",
    "n.",
    "o.",
    "p.",
    "q.",
    "r.",
    "s.",
    "t.",
  ],
  LISTMARK_ROMAN: [
    "i.",
    "ii.",
    "iii.",
    "iv.",
    "v.",
    "vi.",
    "vii.",
    "viii.",
    "ix.",
    "x.",
    "xi.",
    "xii.",
    "xiii.",
    "xiv.",
    "xv.",
    "xvi.",
    "xvii.",
    "xviii.",
    "xix.",
    "xx.",
  ],

  DEFAULT_TEXT_STYLES: {
    fontFamily: "Manrope",
    fontSize: 14,
    fontColor: "rgb(20, 21, 26)",
    fontHighlight: "",
    lineHeight: 1.4,
    bold: false,
    underline: false,
    italic: false,
    "line-through": false,
    overline: false,
    subscript: false,
    superscript: false,
  } as DefaultTextStyles,
  LOG_HOTKEYS: false,
  FORCE_HOTKEYS: "auto" as "auto" | "windows" | "macos",
  debug: false,
  FALLBACK_LNG: "en",
  cursorsMap,
};

export type Settings = typeof conf;
