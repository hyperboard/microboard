import { Subject } from "Subject";
import {
	CameraEvent,
	CancelDrawSelectEvent,
	DrawSelectEvent,
	PointerMoveEvent,
	PresenceEventMsg,
	PresenceEventType,
	SelectionEvent,
	SetUserColorEvent,
	UserJoinMsg,
} from "App/Connection";
import { Board } from "Board/Board";
import { Events } from "Board/Events";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Item, Matrix, Mbr } from "Board/Items";
import { Camera } from "Board/Camera";
import { throttleWithDebounce } from "shared/utils";
import { isMicroboard } from "lib/isMicroboard";
import { catmullRomInterpolate, rgbToRgba } from "./helpers";

export const PRESENCE_COLORS = [
	"rgb(71,120,245)", // light blue
	"rgb(244,142,47)", // orange
	"rgb(38,189,108)", // light green
	"rgb(230,72,61)", // red
	"rgb(146,79,232)", // purple
	"rgb(94,99,110)", // asphalt
	"rgb(142,164,210)", // asphalt light
	"rgb(164,3,111)", // magenta
	"rgb(15,163,177)", // teal
	"rgb(228,191,27)", // yellow
	"rgb(211,84,131)", // pink
	"rgb(147,163,177)", // gray
	"rgb(255,113,91)", // pear
	"rgb(184,146,255)", // light purple
	"rgb(46,134,171)", // navy
	"rgb(49,57,60)", // black
];

export const PRESENCE_CURSOR_THROTTLE = 333;

interface Cursor {
	x: number;
	y: number;
}

export interface PresenceUser {
	nickname: string;
	userId: string;
	color: string; // rgb
	colorChangeable: boolean;
	lastActivity: number;
	selection: string[];
	pointer: Cursor;
	avatar: string | null;
	select?: {
		left: number;
		top: number;
		right: number;
		bottom: number;
	};
	camera: {
		translateX: number;
		translateY: number;
		scaleX: number;
		scaleY: number;
		shearX: number;
		shearY: number;
	} | null;
}

let cleanupInterval: NodeJS.Timer | number | null = null;
const CLEANUP_LIFETIME = 60_000;

export class Presence {
	readonly subject = new Subject<Presence>();
	events: Events | undefined;
	readonly board: Board;
	trackedUser: PresenceUser | null = null;

	private currentUserId: string | null = null;
	users: Map<string, PresenceUser> = new Map();
	private svgImageCache: { [color: string]: HTMLImageElement } = {};
	private cursorPositionHistory: {
		[nickname: string]: {
			x: number;
			y: number;
			timestamp?: number;
		}[];
	} = {};

	constructor(board: Board) {
		this.board = board;
		this.setupUpdateInterval();

		const throttleCameraEvent = throttleWithDebounce(
			this.sendCameraPresence.bind(this),
			500,
			500,
		);

		this.board.camera.subject.subscribe(_camera => {
			throttleCameraEvent(this.board.camera);
		});

		this.board.selection.subject.subscribe(selection => {
			this.emit({
				method: "Selection",
				selectedItems: selection.items.ids(),
				timestamp: Date.now(),
			});
		});
	}

	throttledEmit = throttleWithDebounce(this.emit.bind(this), 500, 500);

	private sendCameraPresence(camera: Camera): void {
		if (camera) {
			this.emit({
				method: "Camera",
				timestamp: Date.now(),
				translateX: camera.matrix.translateX,
				translateY: camera.matrix.translateY,
				scaleX: camera.matrix.scaleX,
				scaleY: camera.matrix.scaleY,
				shearX: camera.matrix.shearX,
				shearY: camera.matrix.shearY,
			});
		}
	}

	setCurrentUser(userId: string): void {
		this.currentUserId = userId;
	}

	setupUpdateInterval(): void {
		if (cleanupInterval) {
			clearInterval(cleanupInterval);
		}
		cleanupInterval = setInterval(() => {
			this.users = new Map(
				Array.from(this.users.entries()).filter(([_, user]) => {
					return Date.now() - user.lastActivity < CLEANUP_LIFETIME;
				}),
			);
			this.subject.publish(this);
		}, 1000);
	}

	addEvents(events: Events): void {
		this.events = events;
	}

	emit(event: PresenceEventType): void {
		if (this.events) {
			this.events.sendPresenceEvent(event);
		}
	}

	push(messages: PresenceEventMsg | PresenceEventMsg[]): void {
		if (Array.isArray(messages)) {
			messages.forEach(msg => this.processMessage(msg));
			return;
		}
		this.processMessage(messages);
	}

	join(msg: UserJoinMsg): void {
		for (const event of msg.events) {
			this.processMessage(event);
		}
	}

	getUsers(excludeSelf = false): PresenceUser[] {
		if (excludeSelf) {
			const currentUser = localStorage.getItem(`currentUser`);
			if (!currentUser) {
				return Array.from(this.users.values());
			}
			return Array.from(this.users.values()).filter(
				user => user.userId !== currentUser,
			);
		} else {
			return Array.from(this.users.values());
		}
	}

	getColors(): string[] {
		return Array.from(this.users.values()).map(user => user.color);
	}

	processMessage(event: PresenceEventMsg): void {
		const { userId, event: eventData } = event;

		let user = this.users.get(userId);
		if (!user) {
			let color: string | null = null;
			const storageColor = localStorage.getItem(`userColor`);
			if (storageColor && storageColor in this.getColors()) {
				color = this.generateUserColor()!;
			} else if (storageColor) {
				color = storageColor;
			} else {
				color = this.generateUserColor();
			}

			this.users.set(userId.toString(), {
				userId: userId.toString(),
				color,
				lastActivity: eventData.timestamp,
				selection: [],
				pointer: { x: 0, y: 0 },
				colorChangeable: true,
				nickname: event.nickname || "Анонимный пользователь",
				camera: null,
				avatar: null,
			});
			user = this.users.get(userId.toString())!;
		}

		switch (eventData.method) {
			case "PointerMove":
				this.processPointerMove(
					event as PresenceEventMsg<PointerMoveEvent>,
				);
				break;

			case "Selection":
				this.processSelection(
					event as PresenceEventMsg<SelectionEvent>,
				);
				break;

			case "SetUserColor":
				this.processSetColor(
					event as PresenceEventMsg<SetUserColorEvent>,
				);
				break;

			case "DrawSelect":
				this.processDrawSelect(
					event as PresenceEventMsg<DrawSelectEvent>,
				);
				break;

			case "CancelDrawSelect":
				this.processCancelDrawSelect(
					event as PresenceEventMsg<CancelDrawSelectEvent>,
				);
				break;

			case "Camera":
				this.processCameraEvent(event as PresenceEventMsg<CameraEvent>);
				break;
		}

		this.subject.publish(this);
	}

	processCameraEvent(msg: PresenceEventMsg<CameraEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: CameraEvent = msg.event;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.camera = eventData;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		if (this.trackedUser) {
			this.board.camera.applyMatrix(
				new Matrix(
					eventData.translateX,
					eventData.translateY,
					eventData.scaleX,
					eventData.scaleY,
					eventData.shearX,
					eventData.shearY,
				),
			);
		}
		this.users.set(msg.userId.toString(), userCopy);
	}

	processDrawSelect(msg: PresenceEventMsg<DrawSelectEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: DrawSelectEvent = msg.event;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.select = eventData.size;
		userCopy.nickname = msg.nickname;
		// userCopy.color = msg.color;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.lastActivity = Date.now();

		this.users.set(msg.userId.toString(), userCopy);
	}

	processCancelDrawSelect(
		msg: PresenceEventMsg<CancelDrawSelectEvent>,
	): void {
		const user = this.users.get(msg.userId.toString())!;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.select = undefined;
		userCopy.nickname = msg.nickname;
		// userCopy.color = msg.color;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.lastActivity = Date.now();

		this.users.set(msg.userId.toString(), userCopy);
	}

	processPointerMove(msg: PresenceEventMsg<PointerMoveEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: PointerMoveEvent = msg.event;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.pointer = { x: eventData.position.x, y: eventData.position.y };
		userCopy.nickname = msg.nickname;
		// userCopy.color = msg.color;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.lastActivity = Date.now();

		this.users.set(msg.userId.toString(), userCopy);
	}

	processSelection(msg: PresenceEventMsg<SelectionEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: SelectionEvent = msg.event;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.selection = eventData.selectedItems;
		userCopy.nickname = msg.nickname;
		// userCopy.color = msg.color;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.lastActivity = Date.now();

		this.users.set(msg.userId.toString(), userCopy);
	}

	processSetColor(msg: PresenceEventMsg<SetUserColorEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: SetUserColorEvent = msg.event;
		const userCopy = { ...user };
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}
		userCopy.color = eventData.color;
		userCopy.colorChangeable = false;
		userCopy.nickname = msg.nickname;
		// userCopy.color = msg.color;
		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.lastActivity = Date.now();

		this.users.set(msg.userId.toString(), userCopy);
	}

	enableTracking(userId: string): void {
		const user = this.users.get(userId);
		if (!user) {
			this.trackedUser = null;
		} else {
			this.trackedUser = user;
			if (this.trackedUser.camera) {
				this.board.camera.applyMatrix(
					new Matrix(
						this.trackedUser.camera.translateX,
						this.trackedUser.camera.translateY,
						this.trackedUser.camera.scaleX,
						this.trackedUser.camera.scaleY,
						this.trackedUser.camera.shearX,
						this.trackedUser.camera.shearY,
					),
				);
			}
		}
	}

	disableTracking(): void {
		this.trackedUser = null;
	}

	getSelects(): {
		left: number;
		top: number;
		right: number;
		bottom: number;
		color: string;
		nickname: string;
	}[] {
		const selects: {
			left: number;
			top: number;
			right: number;
			bottom: number;
			color: string;
			nickname: string;
		}[] = [];
		this.users.forEach(user => {
			if (user.userId !== this.currentUserId) {
				if (user.select) {
					selects.push({
						...user.select,
						color: user.color,
						nickname: user.nickname,
					});
				}
			}
		});
		return selects;
	}

	getCursors(): { x: number; y: number; color: string; nickname: string }[] {
		const cursors: {
			x: number;
			y: number;
			color: string;
			nickname: string;
		}[] = [];
		this.users.forEach(user => {
			if (user.userId !== this.currentUserId) {
				cursors.push({
					...user.pointer,
					color: user.color,
					nickname: user.nickname,
				});
			}
		});
		return cursors;
	}

	getSelections(): { selection: Item[]; color: string }[] {
		const selections: { selection: Item[]; color: string }[] = [];
		this.users.forEach(user => {
			if (user.userId !== this.currentUserId) {
				const items: Item[] = [];
				for (const sel of user.selection) {
					const foundItem = this.board.items.findById(sel);
					if (foundItem) {
						items.push(foundItem);
					}
				}
				selections.push({ selection: items, color: user.color });
			}
		});
		return selections;
	}

	generateUserColor(shouldEmit = true): string {
		const assignedColors = new Set(
			Array.from(this.users.values()).map(user => user.color),
		);

		let generatedColor = "";

		if (assignedColors.size < PRESENCE_COLORS.length) {
			const unusedColors = PRESENCE_COLORS.filter(
				color => !assignedColors.has(color),
			);
			generatedColor =
				unusedColors[Math.floor(Math.random() * unusedColors.length)];
		} else {
			generatedColor =
				PRESENCE_COLORS[
					Math.floor(Math.random() * PRESENCE_COLORS.length)
				];
		}

		if (shouldEmit) {
			this.emit({
				method: "SetUserColor",
				color: generatedColor,
				timestamp: Date.now(),
			});
		}

		localStorage.setItem(`userColor`, generatedColor);

		return generatedColor;
	}

	private getCursorSvg(color: string, scaleFactor = 1): string {
		const width = 24 * scaleFactor;
		const height = 24 * scaleFactor;
		const viewBoxWidth = 24;
		const viewBoxHeight = 24;

		return `<svg width="${width}" height="${height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.28421 4.30174C3.55182 4.02741 3.95268 3.93015 4.31625 4.05135L20.3163 9.38468C20.7064 9.51472 20.9771 9.8703 20.9987 10.2809C21.0202 10.6916 20.7882 11.0736 20.4138 11.2437L20.36 11.2682L20.2042 11.3396C20.069 11.4015 19.8742 11.4912 19.636 11.6017C19.1595 11.8227 18.5109 12.1262 17.8216 12.4571C16.4106 13.1344 14.9278 13.8797 14.3325 14.2765C14.3325 14.2765 14.3258 14.2809 14.308 14.2965C14.2906 14.3118 14.2673 14.3339 14.2382 14.3646C14.1791 14.4267 14.1072 14.5123 14.0231 14.6243C13.8542 14.8496 13.6622 15.1471 13.4541 15.5039C13.0384 16.2164 12.5946 17.1024 12.1833 17.98C11.7735 18.8541 11.4038 19.7031 11.136 20.3348C11.0023 20.6502 10.8944 20.9105 10.8201 21.0915C10.783 21.182 10.7543 21.2525 10.735 21.3002L10.7132 21.3542L10.7066 21.3707C10.5524 21.7561 10.1759 22.0069 9.76082 21.9999C9.34577 21.9928 8.97824 21.7301 8.83725 21.3397L3.05947 5.33967C2.92931 4.97922 3.0166 4.57607 3.28421 4.30174Z" fill="${color}"/>
</svg>`;
	}

	private renderItemMbr(
		context: DrawingContext,
		item: Item,
		color: string,
		customScale?: number,
	): void {
		const mbr = item.getMbr();
		mbr.strokeWidth = !customScale
			? 1 / context.matrix.scaleX
			: 1 / customScale;

		mbr.borderColor = color;
		mbr.render(context);
	}

	private previousCursorPositions: {
		[nickname: string]: {
			x: number;
			y: number;
			timestamp: number;
		};
	} = {};

	private saveImageCache(cursor: {
		x: number;
		y: number;
		color: string;
	}): void {
		if (!this.svgImageCache[cursor.color]) {
			const svg = this.getCursorSvg(cursor.color, 1);
			const svgBlob = new Blob([svg], {
				type: "image/svg+xml",
			});
			const url = URL.createObjectURL(svgBlob);
			const img = new Image();
			img.src = url;

			img.onload = () => {
				this.svgImageCache[cursor.color] = img;
				URL.revokeObjectURL(url);
			};
		}
	}

	// FIXME: FPS are start decreasing when there are many cursors or events. Need to fix
	private renderPointer(context: DrawingContext): void {
		if (!isMicroboard()) {
			return;
		}

		const cursors = this.getCursors();
		const ctx = context.cursorCtx;
		if (!ctx) {
			return;
		}
		const scale = 1 / context.camera.getScale();

		const TRANSITION_DURATION = 250;
		const currentTime = performance.now();

		ctx.save();
		ctx.font = `${14 * scale}px Arial`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";

		Object.values(cursors).forEach(cursor => {
			this.saveImageCache(cursor);

			const cursorHistory =
				this.cursorPositionHistory?.[cursor.nickname] || [];
			const currentPosition = { x: cursor.x, y: cursor.y };

			cursorHistory.push(currentPosition);
			if (cursorHistory.length > 4) {
				cursorHistory.shift();
			}

			if (cursorHistory.length < 4) {
				const previousPosition =
					this.previousCursorPositions[cursor.nickname] ||
					currentPosition;
				const timeSinceLastUpdate =
					currentTime - (previousPosition.timestamp || 0);
				const progress = Math.min(
					1,
					timeSinceLastUpdate / TRANSITION_DURATION,
				);

				const interpolatedX =
					previousPosition.x +
					(currentPosition.x - previousPosition.x) * progress;
				const interpolatedY =
					previousPosition.y +
					(currentPosition.y - previousPosition.y) * progress;

				this.renderCursorWithLabel(
					context,
					cursor,
					{ x: interpolatedX, y: interpolatedY },
					scale,
				);

				this.previousCursorPositions[cursor.nickname] = {
					...previousPosition,
					x: interpolatedX,
					y: interpolatedY,
					timestamp: currentTime,
				};
				return;
			}
			const timeSinceLastUpdate =
				currentTime - (cursorHistory[0].timestamp || 0);
			const progress = Math.min(
				1,
				timeSinceLastUpdate / TRANSITION_DURATION,
			);

			const interpolatedPoint = catmullRomInterpolate(
				cursorHistory[0],
				cursorHistory[1],
				cursorHistory[2],
				cursorHistory[3],
				progress,
			);

			this.renderCursorWithLabel(
				context,
				cursor,
				interpolatedPoint,
				scale,
			);

			this.previousCursorPositions[cursor.nickname] = {
				...currentPosition,
				x: interpolatedPoint.x,
				y: interpolatedPoint.y,
				timestamp: currentTime,
			};
		});

		ctx.restore();

		requestAnimationFrame(() => this.renderPointer(context));
	}

	private renderCursorWithLabel(
		context: DrawingContext,
		cursor: { x: number; y: number; nickname: string; color: string },
		position: { x: number; y: number },
		scale: number,
	): void {
		const ctx = context.cursorCtx;
		if (!ctx) {
			return;
		}

		ctx.clearRect(
			position.x - 100 * scale,
			position.y - 100 * scale,
			1000 * scale,
			1000 * scale,
		);

		const label = cursor.nickname;
		const textWidth = ctx.measureText(label).width;
		const labelHeight = 20 * scale;

		// Shadow and label rendering logic remains the same as in previous implementation
		ctx.shadowColor = "rgba(20, 21, 26, 0.125)";
		ctx.shadowOffsetX = -4 * scale;
		ctx.shadowOffsetY = 4 * scale;
		ctx.shadowBlur = 8 * scale;

		const LABEL_BLOCK_HEIGHT = 32 * scale;
		const X_PADDING = 14 * scale;
		const Y_PADDING = 6 * scale;
		const IMAGE_SIZE = 24 * scale;

		ctx.fillStyle = cursor.color;
		ctx.beginPath();
		ctx.roundRect(
			position.x + IMAGE_SIZE,
			position.y + IMAGE_SIZE,
			textWidth + X_PADDING * 2,
			LABEL_BLOCK_HEIGHT,
			10 * scale,
		);
		ctx.roundRect(
			position.x + IMAGE_SIZE,
			position.y + IMAGE_SIZE,
			12 * scale,
			8 * scale,
		);
		ctx.fill();

		// Disable shadow for text and image
		ctx.shadowColor = "transparent";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText(
			label,
			position.x + IMAGE_SIZE + X_PADDING,
			position.y + IMAGE_SIZE + Y_PADDING + labelHeight / 2,
		);

		const cachedImg = this.svgImageCache[cursor.color];
		if (cachedImg) {
			ctx.drawImage(
				cachedImg,
				position.x,
				position.y,
				IMAGE_SIZE,
				IMAGE_SIZE,
			);
		}
	}

	private renderSelection(context: DrawingContext): void {
		const selections = this.getSelections();
		for (const selection of selections) {
			if (selection.selection.length > 0) {
				let selectionMbr = selection.selection[0].getMbr();
				for (let i = 1; i < selection.selection.length; i++) {
					selectionMbr = selectionMbr.combine([
						selection.selection[i].getMbr(),
					]);
				}
				selectionMbr.strokeWidth = 1 / context.matrix.scaleX;
				selectionMbr.borderColor = selection.color;
				selectionMbr.render(context);
				for (const item of selection.selection) {
					this.renderItemMbr(context, item, selection.color);
				}
			}
		}
	}

	private renderSelect(context: DrawingContext): void {
		if (!isMicroboard()) {
			return;
		}
		const selects = this.getSelects();
		for (const select of selects) {
			const mbr = new Mbr(
				select.left,
				select.top,
				select.right,
				select.bottom,
			);
			mbr.strokeWidth = 1 / context.matrix.scaleX;
			const backgroundColor = rgbToRgba(select.color, 0.2);
			mbr.borderColor = select.color;
			if (backgroundColor) {
				mbr.backgroundColor = backgroundColor;
			}
			mbr.render(context);
		}
	}

	render(context: DrawingContext): void {
		if (context) {
			this.renderPointer(context);
			this.renderSelection(context);
			this.renderSelect(context);
		}
	}
}
