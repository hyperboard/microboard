import { PresenceUser } from "./Presence";

export interface PointerMoveEvent {
	method: "PointerMove";
	position: { x: number; y: number };
	timestamp: number;
}

export interface SelectionEvent {
	method: "Selection";
	selectedItems: string[];
	timestamp: number;
}

export interface SetUserColorEvent {
	method: "SetUserColor";
	timestamp: number;
	color: string;
}

export interface DrawSelectEvent {
	method: "DrawSelect";
	timestamp: number;
	size: {
		left: number;
		top: number;
		right: number;
		bottom: number;
	};
}

export interface CancelDrawSelectEvent {
	method: "CancelDrawSelect";
	timestamp: number;
}

export interface CameraEvent {
	method: "Camera";
	timestamp: number;
	translateX: number;
	translateY: number;
	scaleX: number;
	scaleY: number;
	shearX: number;
	shearY: number;
}

export interface PresencePingEvent {
	method: "Ping";
	timestamp: number;
}

export interface BringToMeEvent {
	method: "BringToMe";
	timestamp: number;
	users: (number | string)[];
}

export interface StopFollowingEvent {
	method: "StopFollowing";
	timestamp: number;
	users: (number | string)[];
}

export interface FollowEvent {
	method: "Follow";
	timestamp: number;
	user: number | string;
}

export interface PresenceUserSnapshot {}

export type PresenceEventType =
	| PointerMoveEvent
	| SelectionEvent
	| SetUserColorEvent
	| DrawSelectEvent
	| CancelDrawSelectEvent
	| CameraEvent
	| PresencePingEvent
	| BringToMeEvent
	| StopFollowingEvent
	| FollowEvent;

export interface UserJoinMsg {
	type: "UserJoin";
	timestamp: number;
	userId: number;
	boardId: string;
	snapshots: Record<string, PresenceUser>;
	// events: PresenceEventMsg<PresenceEventType>[];
}

export interface PresenceEventMsg<T = PresenceEventType> {
	type: "PresenceEvent";
	boardId: string;
	event: T;
	userId: string;
	messageId: string;
	nickname: string;
	color: string | null;
	avatar: string | null;
}
