import { safeRequestAnimationFrame } from 'api/safeRequestAnimationFrame';
import { Board } from 'Board';
import { Camera } from 'Camera';
import { Events } from 'Events';
import { Matrix, Item, Mbr } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import { Subject } from 'Subject';
import { PRESENCE_COLORS } from './consts';
import {
	PresenceEventType,
	PresenceEventMsg,
	UserJoinMsg,
	PointerMoveEvent,
	SelectionEvent,
	SetUserColorEvent,
	DrawSelectEvent,
	CancelDrawSelectEvent,
	CameraEvent,
	PresencePingEvent,
	BringToMeEvent,
	StopFollowingEvent,
	FollowEvent,
} from './Events';
import { catmullRomInterpolate, rgbToRgba } from './helpers';
import { throttleWithDebounce } from './throttle';
import { conf } from 'Settings';
import {BoardSelection} from "../Selection";

// move to SETTINGS
const SECOND = 1000;
const CURSOR_FPS = 3;

export const PRESENCE_CURSOR_THROTTLE = SECOND / CURSOR_FPS;
export const CURSORS_ANIMATION_DURATION = Math.ceil((PRESENCE_CURSOR_THROTTLE / 100) * 85);
export const PRESENCE_CLEANUP_USER_TIMER = 180_000; // Matching Redis ttl
export const PRESENCE_CLEANUP_IDLE_TIMER = 60_000;
export const CURSORS_IDLE_CLEANUP_DELAY = 10_000;
const PING_CLEANUP = 15_000;

interface Cursor {
	x: number;
	y: number;
}

export interface PresenceUser {
	nickname: string;
	userId: string;
	softId: string | null;
	hardId: string | null;
	color: string; // rgb
	colorChangeable: boolean;
	lastActivity: number;
	lastPointerActivity: number;
	lastPing: number;
	boardId: string;
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

export class Presence {
	readonly subject = new Subject<Presence>();
	events: Events | undefined;
	readonly board: Board;
	trackedUser: PresenceUser | null = null;
	private cursorsEnabled = true;
	private drawingContext: DrawingContext | null = null;
	private currentUserId: string | null = null;
	users: Map<string, PresenceUser> = new Map();
	followers: string[] = [];
	private svgImageCache: { [color: string]: HTMLImageElement } = {};
	private cursorPositionHistory: {
		[userId: string]: {
			x: number;
			y: number;
			timestamp?: number;
		}[];
	} = {};
	private previousCursorPositions: {
		[userId: string]: {
			x: number;
			y: number;
			timestamp: number;
		};
	} = {};

	private isPointerRendering = false;
	private pointerAnimationId: number | null = null;

	constructor(board: Board) {
		this.board = board;
		this.setupUpdateInterval();

		const throttleCameraEvent = throttleWithDebounce(
			this.sendCameraPresence.bind(this),
			150,
			150
		);

		const checkIsDisableTrackingNeeded = this.getIsDisableTrackingNeeded.bind(this);

		this.board.camera.subject.subscribe(_camera => {
			throttleCameraEvent(this.board.camera);

			if (checkIsDisableTrackingNeeded()) {
				this.disableTracking();
			}
		});

		const throttleSelectionEvent: (selection: BoardSelection) => void = throttleWithDebounce(
			this.sendSelectionEvent.bind(this),
			400,
			400
		);

		this.board.selection.subject.subscribe(_selection => {
			throttleSelectionEvent(this.board.selection);
		});

		// todo move browser api
		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this.updateCurrentUser.bind(this));
		}
	}

	clear(): void {
		this.users = new Map();
		this.followers = [];
		this.trackedUser = null;
		this.cursorPositionHistory = {};
		this.previousCursorPositions = {};
	}

	throttledEmit = throttleWithDebounce(this.emit.bind(this), 500, 500);

	private sendCameraPresence(camera: Camera): void {
		if (camera) {
			this.emit({
				method: 'Camera',
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

	private sendSelectionEvent(selection: BoardSelection): void {
		this.emit({
			method: 'Selection',
			selectedItems: selection.items.ids(),
			timestamp: Date.now(),
		});
	}

	getIsDisableTrackingNeeded(): boolean {
		const trackedUser = this.trackedUser;
		if (!trackedUser || !trackedUser.camera) {
			return false;
		}
		return !this.board.camera.matrix.compare(
			new Matrix(
				trackedUser.camera.translateX,
				trackedUser.camera.translateY,
				trackedUser.camera.scaleX,
				trackedUser.camera.scaleY,
				trackedUser.camera.shearX,
				trackedUser.camera.shearY
			)
		);
	}

	setCurrentUser(userId: string): void {
		this.currentUserId = userId;
	}

	private updateCurrentUser(event: StorageEvent) {
		if (event.key === 'currentUser') {
			if (event.newValue) {
				this.setCurrentUser(event.newValue);
			}
		}
	}

	cleanup() {
		// todo move browser api
		if (typeof window !== 'undefined') {
			window.removeEventListener('storage', this.updateCurrentUser.bind(this));
		}
		this.drawingContext = null;
		this.clear();
		this.stopPointerRendering();
	}

	setupUpdateInterval(): void {
		if (cleanupInterval) {
			clearInterval(cleanupInterval);
		}
		cleanupInterval = setInterval(() => {
			this.users = new Map(
				Array.from(this.users.entries()).filter(([_, user]) => {
					return Date.now() - user.lastActivity < PRESENCE_CLEANUP_USER_TIMER;
				})
			);
			this.subject.publish(this);
		}, 1000);
	}

	addEvents(events: Events): void {
		this.events = events;
	}

	emit(event: PresenceEventType): void {
		if (this.events && this.board.getInterfaceType() === 'edit' && this.board.getIsOpen()) {
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

	// Maintaining current user presence
	ping(): void {
		this.emit({
			method: 'Ping',
			timestamp: Date.now(),
		});
	}

	join(msg: UserJoinMsg): void {
		Object.entries(msg.snapshots).map(([userId, snapshot]) => {
			this.users.set(userId, snapshot);
		});
		this.subject.publish(this);
	}

	getUsers(boardId: string, excludeSelf = false): PresenceUser[] {
		let filteredUsers = Array.from(this.users.values()).filter(
			user =>
				user.boardId === boardId &&
				(user.lastPing > Date.now() - PING_CLEANUP ||
					user.lastActivity > Date.now() - PING_CLEANUP)
		);

		if (excludeSelf) {
			const currentUser = localStorage.getItem('currentUser');
			if (currentUser) {
				filteredUsers = filteredUsers.filter(user => user.userId !== currentUser);
			}
		}

		const uniqueUsers = new Map<string | null | symbol, PresenceUser>();
		filteredUsers.forEach(user => {
			const key = user.hardId === null ? Symbol() : user.hardId;
			uniqueUsers.set(key, user);
		});

		return Array.from(uniqueUsers.values());
	}

	getColors(): string[] {
		return Array.from(this.users.values()).map(user => user.color);
	}

	processMessage(event: PresenceEventMsg): void {
		if (!this.drawingContext) {
			return;
		}
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
				softId: event.softId,
				hardId: event.hardId,
				color,
				lastActivity: eventData.timestamp,
				lastPing: eventData.timestamp,
				selection: [],
				pointer: { x: 0, y: 0 },
				colorChangeable: true,
				nickname: event.nickname || 'Anonymous',
				camera: null,
				avatar: null,
				boardId: this.board.getBoardId(),
				lastPointerActivity: eventData.timestamp,
			});
			user = this.users.get(userId.toString())!;
		}

		switch (eventData.method) {
			case 'PointerMove':
				this.processPointerMove(event as PresenceEventMsg<PointerMoveEvent>);
				break;

			case 'Selection':
				this.processSelection(event as PresenceEventMsg<SelectionEvent>);
				break;

			case 'SetUserColor':
				this.processSetColor(event as PresenceEventMsg<SetUserColorEvent>);
				break;

			case 'DrawSelect':
				this.processDrawSelect(event as PresenceEventMsg<DrawSelectEvent>);
				break;

			case 'CancelDrawSelect':
				this.processCancelDrawSelect(event as PresenceEventMsg<CancelDrawSelectEvent>);
				break;

			case 'Camera':
				this.processCameraEvent(event as PresenceEventMsg<CameraEvent>);
				break;

			case 'Ping':
				this.processPing(event as PresenceEventMsg<PresencePingEvent>);
				break;

			case 'BringToMe':
				this.processBringToMe(event as PresenceEventMsg<BringToMeEvent>);
				break;

			case 'StopFollowing':
				this.processStopFollowing(event as PresenceEventMsg<StopFollowingEvent>);
				break;

			case 'Follow':
				this.processFollowEvent(event as PresenceEventMsg<FollowEvent>);
				break;
		}

		this.subject.publish(this);
	}

	private updateUserMetaInfo(
		msg: PresenceEventMsg,
		userCopy: PresenceUser,
		shouldUpdateActivity = true
	): void {
		if (msg.avatar) {
			userCopy.avatar = msg.avatar;
		}

		if (msg.color) {
			userCopy.color = msg.color;
		}
		userCopy.nickname = msg.nickname;
		userCopy.boardId = msg.boardId;
		if (shouldUpdateActivity) {
			userCopy.lastActivity = Date.now();
		}
	}

	processFollowEvent(msg: PresenceEventMsg<FollowEvent>): void {
		const currentUser = localStorage.getItem(`currentUser`);
		if (!currentUser) {
			return;
		}

		if (msg.event.user === currentUser) {
			this.followers.push(msg.userId.toString());
			this.followers = Array.from(new Set(this.followers));
		}
	}

	processBringToMe(msg: PresenceEventMsg<BringToMeEvent>): void {
		const currentUser = localStorage.getItem(`currentUser`);
		if (!currentUser) {
			return;
		}
		if (msg.event.users.includes(currentUser)) {
			const bringerId = msg.userId.toString();
			const userToTrack = this.users.get(bringerId);
			if (userToTrack) {
				this.trackedUser = userToTrack;
				this.enableTracking(userToTrack.userId);
			}
		}
	}

	processStopFollowing(msg: PresenceEventMsg<StopFollowingEvent>): void {
		const currentUser = localStorage.getItem(`currentUser`);
		if (!currentUser) {
			return;
		}
		if (msg.event.users.includes(currentUser)) {
			this.followers = this.followers.filter(follower => follower !== msg.userId.toString());
		}
		if (!this.trackedUser) {
			return;
		}
		if (this.trackedUser.userId !== msg.userId) {
			return;
		}
		if (msg.event.users.includes(currentUser) && this.trackedUser.userId === msg.userId) {
			this.disableTracking();
		}
	}

	processPing(msg: PresenceEventMsg<PresencePingEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		user.lastPing = msg.event.timestamp;
		const userCopy = { ...user };
		this.updateUserMetaInfo(msg, userCopy, false);
		this.users.set(msg.userId.toString(), userCopy);
	}

	processCameraEvent(msg: PresenceEventMsg<CameraEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: CameraEvent = msg.event;
		const userCopy = { ...user };
		userCopy.camera = eventData;
		this.updateUserMetaInfo(msg, userCopy);
		this.users.set(msg.userId.toString(), userCopy);
		if (this.trackedUser) {
			this.trackedUser.camera = eventData;
			this.board.camera.applyMatrix(
				new Matrix(
					eventData.translateX,
					eventData.translateY,
					eventData.scaleX,
					eventData.scaleY,
					eventData.shearX,
					eventData.shearY
				)
			);
		}
	}

	processDrawSelect(msg: PresenceEventMsg<DrawSelectEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: DrawSelectEvent = msg.event;
		const userCopy = { ...user };
		this.updateUserMetaInfo(msg, userCopy);
		userCopy.select = eventData.size;

		this.users.set(msg.userId.toString(), userCopy);
	}

	processCancelDrawSelect(msg: PresenceEventMsg<CancelDrawSelectEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const userCopy = { ...user };
		this.updateUserMetaInfo(msg, userCopy);
		userCopy.select = undefined;

		this.users.set(msg.userId.toString(), userCopy);
	}

	processPointerMove(msg: PresenceEventMsg<PointerMoveEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: PointerMoveEvent = msg.event;
		const userCopy = { ...user };
		this.updateUserMetaInfo(msg, userCopy);
		userCopy.lastPointerActivity = Date.now();
		userCopy.pointer = { x: eventData.position.x, y: eventData.position.y };
		this.users.set(msg.userId.toString(), userCopy);
	}

	processSelection(msg: PresenceEventMsg<SelectionEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const eventData: SelectionEvent = msg.event;
		const userCopy = { ...user };
		this.updateUserMetaInfo(msg, userCopy);
		userCopy.selection = eventData.selectedItems;
		this.users.set(msg.userId.toString(), userCopy);
	}

	processSetColor(msg: PresenceEventMsg<SetUserColorEvent>): void {
		const user = this.users.get(msg.userId.toString())!;
		const userCopy = { ...user };
		userCopy.colorChangeable = false;
		this.updateUserMetaInfo(msg, userCopy);
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
						this.trackedUser.camera.shearY
					)
				);
			}
			this.emit({
				method: 'Follow',
				user: userId,
				timestamp: Date.now(),
			});
		}
	}

	disableTracking(): void {
		if (!this.trackedUser) {
			return;
		}
		this.emit({
			method: 'StopFollowing',
			timestamp: Date.now(),
			users: [this.trackedUser?.userId],
		});
		this.trackedUser = null;
	}

	getFollowers(): PresenceUser[] {
		const followers: PresenceUser[] = [];

		for (const followerId of this.followers) {
			const follower = this.users.get(followerId);
			if (follower) {
				followers.push(follower);
			}
		}

		return followers;
	}

	toggleCursorsRendering(): boolean {
		this.cursorsEnabled = !this.cursorsEnabled;

		return this.cursorsEnabled;
	}

	getSelects(): {
		left: number;
		top: number;
		right: number;
		bottom: number;
		color: string;
		nickname: string;
	}[] {
		const uniqueUsers = new Map<string | null | symbol, PresenceUser>();
		this.users.forEach(user => {
			if (user.userId !== this.currentUserId) {
				const key =
					user.hardId !== null ? `hardId:${user.hardId}` : `softId:${user.userId}`;
				const existingUser = uniqueUsers.get(key);
				if (!existingUser || user.lastActivity > existingUser.lastActivity) {
					uniqueUsers.set(key, user);
				}
			}
		});

		const selects: {
			left: number;
			top: number;
			right: number;
			bottom: number;
			color: string;
			nickname: string;
		}[] = [];

		uniqueUsers.forEach(user => {
			if (user.select && Date.now() - user.lastActivity <= CURSORS_IDLE_CLEANUP_DELAY) {
				selects.push({
					...user.select,
					color: user.color,
					nickname: user.nickname,
				});
			}
		});

		return selects;
	}

	getCursors(): {
		x: number;
		y: number;
		color: string;
		nickname: string;
		userId: string;
	}[] {
		const currentBoardId = this.board.getBoardId();
		const now = Date.now();

		const uniqueUsers = new Map<string | null | symbol, PresenceUser>();
		this.users.forEach(user => {
			if (
				user.userId !== this.currentUserId &&
				user.boardId === currentBoardId &&
				now - user.lastPointerActivity <= CURSORS_IDLE_CLEANUP_DELAY
			) {
				const key =
					user.hardId !== null ? `hardId:${user.hardId}` : `softId:${user.userId}`;
				const existingUser = uniqueUsers.get(key);
				if (!existingUser || user.lastActivity > existingUser.lastActivity) {
					uniqueUsers.set(key, user);
				}
			}
		});

		const cursors: {
			userId: string;
			x: number;
			y: number;
			color: string;
			nickname: string;
		}[] = [];

		uniqueUsers.forEach(user => {
			cursors.push({
				...user.pointer,
				userId: user.userId,
				color: user.color,
				nickname: user.nickname,
			});
		});

		return cursors;
	}

	getSelections(): { selection: Item[]; color: string }[] {
		const currentBoardId = this.board.getBoardId();
		const now = Date.now();

		const uniqueUsers = new Map<string | null | symbol, PresenceUser>();
		this.users.forEach(user => {
			if (
				user.userId !== this.currentUserId &&
				user.boardId === currentBoardId &&
				now - user.lastPointerActivity <= CURSORS_IDLE_CLEANUP_DELAY
			) {
				const key =
					user.hardId !== null ? `hardId:${user.hardId}` : `softId:${user.userId}`;
				const existingUser = uniqueUsers.get(key);
				if (!existingUser || user.lastActivity > existingUser.lastActivity) {
					uniqueUsers.set(key, user);
				}
			}
		});

		const selections: { selection: Item[]; color: string }[] = [];

		uniqueUsers.forEach(user => {
			if (Date.now() - user.lastActivity >= CURSORS_IDLE_CLEANUP_DELAY) {
				return;
			}
			const items: Item[] = [];
			for (const sel of user.selection) {
				const foundItem = this.board.items.findById(sel);
				if (foundItem) {
					items.push(foundItem);
				}
			}
			selections.push({ selection: items, color: user.color });
		});

		return selections;
	}

	generateUserColor(shouldEmit = true): string {
		const assignedColors = new Set(Array.from(this.users.values()).map(user => user.color));

		let generatedColor = '';

		if (assignedColors.size < PRESENCE_COLORS.length) {
			const unusedColors = PRESENCE_COLORS.filter(color => !assignedColors.has(color));
			generatedColor = unusedColors[Math.floor(Math.random() * unusedColors.length)];
		} else {
			generatedColor = PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
		}

		if (shouldEmit) {
			this.emit({
				method: 'SetUserColor',
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
		customScale?: number
	): void {
		const mbr = item.getMbr();
		mbr.strokeWidth = !customScale ? 1 / context.matrix.scaleX : 1 / customScale;

		mbr.borderColor = color;
		mbr.render(context);
	}

	private saveImageCache(cursor: { x: number; y: number; color: string }): void {
		if (!this.svgImageCache[cursor.color]) {
			const svg = this.getCursorSvg(cursor.color, 1);
			const svgBlob = new Blob([svg], {
				type: 'image/svg+xml',
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

	private renderPointer(context: DrawingContext): void {
		if (this.isPointerRendering) {
			return;
		}
		this.isPointerRendering = true;

		const ctx = context.cursorCtx;

		if (!ctx) {
			this.stopPointerRendering();
			return;
		}

		const renderLoop = (): void => {
			const context = this.drawingContext;
			if (!context) {
				this.stopPointerRendering();
				return;
			}
			const ctx = context.cursorCtx;
			if (!ctx) {
				this.stopPointerRendering();
				return;
			}

			const scale = 1 / context.camera.getScale();
			const cursors = this.getCursors();
			const currentTime = performance.now();

			ctx.save();
			ctx.font = `${14 * scale}px Arial`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			const cameraMbr = this.board.camera.getMbr();
			ctx.clearRect(
				cameraMbr.left,
				cameraMbr.top,
				cameraMbr.getWidth(),
				cameraMbr.getHeight()
			);

			Object.values(cursors).forEach(cursor => {
				this.saveImageCache(cursor);

				const cursorHistory = this.cursorPositionHistory[cursor.userId] || [];
				const currentPosition = { x: cursor.x, y: cursor.y };
				cursorHistory.push(currentPosition);

				if (cursorHistory.length > 4) {
					cursorHistory.shift();
				}

				if (cursorHistory.length < 4) {
					const previousPosition =
						this.previousCursorPositions[cursor.userId] || currentPosition;
					const timeSinceLastUpdate = currentTime - (previousPosition.timestamp || 0);
					const progress = Math.min(1, timeSinceLastUpdate / CURSORS_ANIMATION_DURATION);

					const interpolatedX =
						previousPosition.x + (currentPosition.x - previousPosition.x) * progress;
					const interpolatedY =
						previousPosition.y + (currentPosition.y - previousPosition.y) * progress;

					this.renderCursorWithLabel(
						context,
						cursor,
						{ x: interpolatedX, y: interpolatedY },
						scale
					);

					this.previousCursorPositions[cursor.userId] = {
						...previousPosition,
						x: interpolatedX,
						y: interpolatedY,
						timestamp: currentTime,
					};
					return;
				}

				const timeSinceLastUpdate = currentTime - (cursorHistory[0].timestamp || 0);

				const progress = Math.min(1, timeSinceLastUpdate / CURSORS_ANIMATION_DURATION);

				const interpolatedPoint = catmullRomInterpolate(
					cursorHistory[0],
					cursorHistory[1],
					cursorHistory[2],
					cursorHistory[3],
					progress
				);

				this.renderCursorWithLabel(context, cursor, interpolatedPoint, scale);

				this.previousCursorPositions[cursor.userId] = {
					...interpolatedPoint,
					x: interpolatedPoint.x,
					y: interpolatedPoint.y,
					timestamp: currentTime,
				};
			});

			ctx.restore();

			this.pointerAnimationId = safeRequestAnimationFrame(renderLoop) || null;
		};

		renderLoop();
	}

	private stopPointerRendering(): void {
		if (this.pointerAnimationId !== null) {
			cancelAnimationFrame(this.pointerAnimationId);
			this.pointerAnimationId = null;
			this.isPointerRendering = false;
		}
	}

	private renderCursorWithLabel(
		context: DrawingContext,
		cursor: { x: number; y: number; nickname: string; color: string },
		position: { x: number; y: number },
		scale: number
	): void {
		if (!this.cursorsEnabled) {
			return;
		}
		const ctx = context.cursorCtx;
		if (!ctx) {
			return;
		}

		const anonTranslate = conf.i18n.t('presence.anonymous');
		const label = cursor.nickname === 'Anonymous' ? anonTranslate : cursor.nickname;
		const textWidth = ctx.measureText(label).width;
		const labelHeight = 20 * scale;

		ctx.shadowColor = 'rgba(20, 21, 26, 0.125)';
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
			10 * scale
		);
		ctx.roundRect(position.x + IMAGE_SIZE, position.y + IMAGE_SIZE, 12 * scale, 8 * scale);
		ctx.fill();

		ctx.shadowColor = 'transparent';
		ctx.fillStyle = '#FFFFFF';
		ctx.fillText(
			label,
			position.x + IMAGE_SIZE + X_PADDING,
			position.y + IMAGE_SIZE + Y_PADDING + labelHeight / 2
		);

		const cachedImg = this.svgImageCache[cursor.color];
		if (cachedImg) {
			ctx.drawImage(cachedImg, position.x, position.y, IMAGE_SIZE, IMAGE_SIZE);
		}
	}

	private renderSelection(context: DrawingContext): void {
		const selections = this.getSelections();
		for (const selection of selections) {
			if (selection.selection.length > 0) {
				let selectionMbr = selection.selection[0].getMbr();
				for (let i = 1; i < selection.selection.length; i++) {
					selectionMbr = selectionMbr.combine([selection.selection[i].getMbr()]);
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
		const selects = this.getSelects();
		for (const select of selects) {
			const mbr = new Mbr(select.left, select.top, select.right, select.bottom);
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
		if (context && this.board.getIsOpen()) {
			this.drawingContext = context;
			this.renderPointer(context);
			this.renderSelection(context);
			this.renderSelect(context);
		}
	}
}
