import { z } from "zod";

const StringOrNumberSchema = z.union([z.string(), z.number()]);
const StringArraySchema = z.array(z.string());
const UnknownRecordSchema = z.record(z.string(), z.unknown());
const TimestampSchema = z.number();
const accessModeValues = ["view", "edit"] as const;
export const AccessModeSchema = z.enum(accessModeValues);
const OptionalTransportTimestampSchema = z.object({
	timeStamp: TimestampSchema.optional(),
	timestamp: TimestampSchema.optional(),
});

const MatrixDataSchema = z
	.object({
		translateX: z.number(),
		translateY: z.number(),
		scaleX: z.number(),
		scaleY: z.number(),
		shearX: z.number(),
		shearY: z.number(),
	})
	.passthrough();

const ApplyMatrixItemSchema = z
	.object({
		id: z.string(),
		matrix: MatrixDataSchema,
	})
	.passthrough();

const UndoOperationSchema = z
	.object({
		class: z.literal("Events"),
		method: z.literal("undo"),
		eventId: z.string(),
	})
	.passthrough();

const RedoOperationSchema = z
	.object({
		class: z.literal("Events"),
		method: z.literal("redo"),
		eventId: z.string(),
	})
	.passthrough();

const AddSingleItemBoardOperationSchema = z
	.object({
		class: z.literal("Board"),
		method: z.literal("add"),
		item: z.string(),
		data: z.unknown(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const AddManyItemsBoardOperationSchema = z
	.object({
		class: z.literal("Board"),
		method: z.literal("add"),
		item: StringArraySchema,
		data: UnknownRecordSchema,
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const BoardOperationSchemas = [
	AddSingleItemBoardOperationSchema,
	AddManyItemsBoardOperationSchema,
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("addLockedGroup"),
			item: z.string(),
			data: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("addGroup"),
			item: z.string(),
			data: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("remove"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("lock"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("unlock"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("removeLockedGroup"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("removeGroup"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("moveToZIndex"),
			item: z.string(),
			zIndex: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("moveManyToZIndex"),
			item: z.record(z.string(), z.number()),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("moveSecondBeforeFirst"),
			item: z.string(),
			secondItem: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("moveSecondAfterFirst"),
			item: z.string(),
			secondItem: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("bringToFront"),
			item: StringArraySchema,
			prevZIndex: z.record(z.string(), z.number()),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("sendToBack"),
			item: StringArraySchema,
			prevZIndex: z.record(z.string(), z.number()),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("paste"),
			itemsMap: UnknownRecordSchema,
			select: z.boolean(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Board"),
			method: z.literal("duplicate"),
			itemsMap: UnknownRecordSchema,
		})
		.passthrough(),
] as const;

const TranslateOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.enum(["translateTo", "translateBy"]),
		item: StringArraySchema,
		x: z.number(),
		y: z.number(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const ScaleOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.enum(["scaleTo", "scaleBy"]),
		item: StringArraySchema,
		x: z.number(),
		y: z.number(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const RotateOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.enum(["rotateTo", "rotateBy"]),
		item: StringArraySchema,
		degree: z.number(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const ScaleRelativeToOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.enum(["scaleToRelativeTo", "scaleByRelativeTo"]),
		item: StringArraySchema,
		x: z.number(),
		y: z.number(),
		point: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.passthrough(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const ScaleByTranslateByOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.literal("scaleByTranslateBy"),
		item: StringArraySchema,
		translate: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.passthrough(),
		scale: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.passthrough(),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const ApplyMatrixOperationSchema = z
	.object({
		class: z.literal("Transformation"),
		method: z.literal("applyMatrix"),
		items: z.array(ApplyMatrixItemSchema),
	})
	.extend(OptionalTransportTimestampSchema.shape)
	.passthrough();

const TransformManyItemsOperationSchema = z.union([
	ApplyMatrixOperationSchema,
	ScaleByTranslateByOperationSchema,
	ScaleOperationSchema,
	TranslateOperationSchema,
]);

const TransformationOperationSchemas = [
	TranslateOperationSchema,
	ScaleOperationSchema,
	RotateOperationSchema,
	ScaleRelativeToOperationSchema,
	ScaleByTranslateByOperationSchema,
	z
		.object({
			class: z.literal("Transformation"),
			method: z.literal("deserialize"),
			item: StringArraySchema,
			data: z.unknown(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	z
		.object({
			class: z.literal("Transformation"),
			method: z.literal("locked"),
			item: StringArraySchema,
			locked: z.boolean(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	z
		.object({
			class: z.literal("Transformation"),
			method: z.literal("unlocked"),
			item: StringArraySchema,
			locked: z.boolean(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	ApplyMatrixOperationSchema,
	z
		.object({
			class: z.literal("Transformation"),
			method: z.literal("transformMany"),
			items: z.record(z.string(), TransformManyItemsOperationSchema),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
] as const;

const ShapeOperationSchemas = [
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBackgroundColor"),
			item: StringArraySchema,
			backgroundColor: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBackgroundOpacity"),
			item: StringArraySchema,
			backgroundOpacity: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBorderColor"),
			item: StringArraySchema,
			borderColor: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBorderOpacity"),
			item: StringArraySchema,
			borderOpacity: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBorderStyle"),
			item: StringArraySchema,
			borderStyle: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setBorderWidth"),
			item: StringArraySchema,
			borderWidth: z.number(),
			prevBorderWidth: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Shape"),
			method: z.literal("setShapeType"),
			item: StringArraySchema,
			shapeType: z.unknown(),
		})
		.passthrough(),
] as const;

const StickerOperationSchema = z
	.object({
		class: z.literal("Sticker"),
		method: z.literal("setBackgroundColor"),
		item: StringArraySchema,
		backgroundColor: z.unknown(),
	})
	.passthrough();

const RichTextWholeTextOperationSchema = z.union([
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setFontColor"),
			item: StringArraySchema,
			fontColor: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setFontStyle"),
			item: StringArraySchema,
			fontStyleList: z.array(z.unknown()),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setFontFamily"),
			item: StringArraySchema,
			fontFamily: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setFontSize"),
			item: StringArraySchema,
			fontSize: z.union([z.number(), z.literal("auto")]),
			context: z.unknown().optional(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setFontHighlight"),
			item: StringArraySchema,
			fontHighlight: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setHorisontalAlignment"),
			item: StringArraySchema,
			horisontalAlignment: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setVerticalAlignment"),
			item: StringArraySchema,
			verticalAlignment: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("RichText"),
			method: z.literal("setMaxWidth"),
			item: StringArraySchema,
			maxWidth: z.number().optional(),
		})
		.passthrough(),
]);

const RichTextSelectionOperationSchema = z
	.object({
		class: z.literal("RichText"),
		method: z.enum([
			"setSelectionHorisontalAlignment",
			"setSelectionFontHighlight",
			"setSelectionFontSize",
			"setSelectionFontFamily",
			"setSelectionFontStyle",
			"setSelectionFontColor",
			"setSelectionBlockType",
			"edit",
		]),
		item: StringArraySchema,
		selection: z.unknown(),
		ops: z.array(z.unknown()),
	})
	.passthrough();

const RichTextGroupEditOperationSchema = z
	.object({
		class: z.literal("RichText"),
		method: z.literal("groupEdit"),
		itemsOps: z.array(
			z
				.object({
					item: z.string(),
					selection: z.unknown(),
					ops: z.array(z.unknown()),
				})
				.passthrough()
		),
	})
	.passthrough();

const ConnectorOperationSchemas = [
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setStartPoint"),
			item: StringArraySchema,
			startPointData: z.unknown(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setEndPoint"),
			item: StringArraySchema,
			endPointData: z.unknown(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setMiddlePoint"),
			item: StringArraySchema,
			middlePointData: z.unknown().nullable(),
		})
		.extend(OptionalTransportTimestampSchema.shape)
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setStartPointerStyle"),
			item: StringArraySchema,
			startPointerStyle: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setEndPointerStyle"),
			item: StringArraySchema,
			endPointerStyle: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setLineStyle"),
			item: StringArraySchema,
			lineStyle: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setBorderStyle"),
			item: StringArraySchema,
			borderStyle: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setLineColor"),
			item: StringArraySchema,
			lineColor: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setLineWidth"),
			item: StringArraySchema,
			lineWidth: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("switchPointers"),
			item: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Connector"),
			method: z.literal("setSmartJump"),
			item: StringArraySchema,
			smartJump: z.boolean(),
		})
		.passthrough(),
] as const;

const DrawingOperationSchemas = [
	z
		.object({
			class: z.literal("Drawing"),
			method: z.literal("setStrokeColor"),
			item: StringArraySchema,
			color: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Drawing"),
			method: z.literal("setStrokeWidth"),
			item: StringArraySchema,
			width: z.number(),
			prevWidth: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Drawing"),
			method: z.literal("setStrokeOpacity"),
			item: StringArraySchema,
			opacity: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Drawing"),
			method: z.literal("setStrokeStyle"),
			item: StringArraySchema,
			style: z.string(),
		})
		.passthrough(),
] as const;

const FrameOperationSchemas = [
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("setBackgroundColor"),
			item: StringArraySchema,
			backgroundColor: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("setCanChangeRatio"),
			item: StringArraySchema,
			canChangeRatio: z.boolean(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("setFrameType"),
			item: StringArraySchema,
			shapeType: z.unknown(),
			prevShapeType: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("addChild"),
			item: StringArraySchema,
			childId: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("removeChild"),
			item: StringArraySchema,
			childId: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("addChildren"),
			item: StringArraySchema,
			childId: StringArraySchema,
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Frame"),
			method: z.literal("removeChildren"),
			item: StringArraySchema,
			childId: StringArraySchema,
		})
		.passthrough(),
] as const;

const LinkToOperationSchema = z
	.object({
		class: z.literal("LinkTo"),
		method: z.literal("setLinkTo"),
		item: StringArraySchema,
		link: z.string().optional(),
	})
	.passthrough();

const PlaceholderOperationSchemas = [
	z
		.object({
			class: z.literal("Placeholder"),
			method: z.literal("setBackgroundColor"),
			item: StringArraySchema,
			backgroundColor: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Placeholder"),
			method: z.literal("setIcon"),
			item: StringArraySchema,
			icon: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Placeholder"),
			method: z.literal("setMiroData"),
			item: StringArraySchema,
			miroData: z.unknown(),
		})
		.passthrough(),
] as const;

const GroupOperationSchemas = [
	z
		.object({
			class: z.literal("Group"),
			method: z.literal("addChild"),
			item: StringArraySchema,
			childId: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Group"),
			method: z.literal("removeChild"),
			item: StringArraySchema,
			childId: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Group"),
			method: z.literal("addChildren"),
			item: StringArraySchema,
			newData: z
				.object({
					childIds: StringArraySchema,
				})
				.passthrough(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Group"),
			method: z.literal("removeChildren"),
			item: StringArraySchema,
			newData: z
				.object({
					childIds: StringArraySchema,
				})
				.passthrough(),
		})
		.passthrough(),
] as const;

const CommentOperationSchemas = [
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("createMessage"),
			item: StringArraySchema,
			message: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("editMessage"),
			item: StringArraySchema,
			message: z.unknown(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("removeMessage"),
			item: StringArraySchema,
			messageId: z.string(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("setResolved"),
			item: StringArraySchema,
			resolved: z.boolean(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("setItemToFollow"),
			item: StringArraySchema,
			itemId: z.string().optional(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("markMessagesAsRead"),
			item: StringArraySchema,
			messageIds: StringArraySchema,
			userId: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("markThreadAsUnread"),
			item: StringArraySchema,
			userId: z.number(),
		})
		.passthrough(),
	z
		.object({
			class: z.literal("Comment"),
			method: z.literal("markThreadAsRead"),
			item: StringArraySchema,
			userId: z.number(),
		})
		.passthrough(),
] as const;

const ImageOperationSchema = z
	.object({
		class: z.literal("Image"),
		method: z.literal("updateImageData"),
		item: StringArraySchema,
		data: z.unknown(),
	})
	.passthrough();

const VideoOperationSchema = z
	.object({
		class: z.literal("Video"),
		method: z.literal("updateVideoData"),
		item: StringArraySchema,
		data: z.unknown(),
	})
	.passthrough();

const AudioOperationSchema = z
	.object({
		class: z.literal("Audio"),
		method: z.literal("setUrl"),
		item: StringArraySchema,
		url: z.string(),
	})
	.passthrough();

export const SocketOperationSchema = z.union([
	UndoOperationSchema,
	RedoOperationSchema,
	...BoardOperationSchemas,
	...TransformationOperationSchemas,
	...ShapeOperationSchemas,
	StickerOperationSchema,
	RichTextWholeTextOperationSchema,
	RichTextSelectionOperationSchema,
	RichTextGroupEditOperationSchema,
	...ConnectorOperationSchemas,
	...DrawingOperationSchemas,
	...FrameOperationSchemas,
	LinkToOperationSchema,
	...PlaceholderOperationSchemas,
	...GroupOperationSchemas,
	...CommentOperationSchemas,
	ImageOperationSchema,
	VideoOperationSchema,
	AudioOperationSchema,
]);

export const SocketBoardEventBodySchema = z
	.object({
		eventId: z.string(),
		userId: StringOrNumberSchema.optional(),
		authorUserId: z.string().optional(),
		sessionId: z.string().optional(),
		boardId: z.string(),
		operation: SocketOperationSchema,
	})
	.passthrough();

export const SocketBoardEventPackBodySchema = z
	.object({
		eventId: z.string(),
		userId: StringOrNumberSchema.optional(),
		authorUserId: z.string().optional(),
		sessionId: z.string().optional(),
		boardId: z.string(),
		operations: z.array(SocketOperationSchema),
	})
	.passthrough();

export const SocketBoardEventSchema = z
	.object({
		order: z.number(),
		body: SocketBoardEventBodySchema,
	})
	.passthrough();

export const SocketBoardEventPackSchema = z
	.object({
		order: z.number(),
		body: SocketBoardEventPackBodySchema,
	})
	.passthrough();

export const SocketSyncBoardEventSchema = z
	.object({
		order: z.number(),
		lastKnownOrder: z.number(),
		body: SocketBoardEventBodySchema,
	})
	.passthrough();

export const SocketSyncBoardEventPackSchema = z
	.object({
		order: z.number(),
		body: SocketBoardEventPackBodySchema.extend({
			lastKnownOrder: z.number(),
		}),
	})
	.passthrough();

export const SocketSyncEventSchema = z.union([
	SocketSyncBoardEventSchema,
	SocketSyncBoardEventPackSchema,
]);

export const PointerMovePresenceEventSchema = z
	.object({
		method: z.literal("PointerMove"),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.passthrough(),
		timestamp: z.number(),
	})
	.passthrough();

export const SelectionPresenceEventSchema = z
	.object({
		method: z.literal("Selection"),
		selectedItems: StringArraySchema,
		timestamp: z.number(),
	})
	.passthrough();

export const SetUserColorPresenceEventSchema = z
	.object({
		method: z.literal("SetUserColor"),
		timestamp: z.number(),
		color: z.string(),
	})
	.passthrough();

export const DrawSelectPresenceEventSchema = z
	.object({
		method: z.literal("DrawSelect"),
		timestamp: z.number(),
		size: z
			.object({
				left: z.number(),
				top: z.number(),
				right: z.number(),
				bottom: z.number(),
			})
			.passthrough(),
	})
	.passthrough();

export const CancelDrawSelectPresenceEventSchema = z
	.object({
		method: z.literal("CancelDrawSelect"),
		timestamp: z.number(),
	})
	.passthrough();

export const CameraPresenceEventSchema = z
	.object({
		method: z.literal("Camera"),
		timestamp: z.number(),
		translateX: z.number(),
		translateY: z.number(),
		scaleX: z.number(),
		scaleY: z.number(),
		shearX: z.number(),
		shearY: z.number(),
	})
	.passthrough();

export const PingPresenceEventSchema = z
	.object({
		method: z.literal("Ping"),
		timestamp: z.number(),
	})
	.passthrough();

export const BringToMePresenceEventSchema = z
	.object({
		method: z.literal("BringToMe"),
		timestamp: z.number(),
		users: z.array(StringOrNumberSchema),
	})
	.passthrough();

export const StopFollowingPresenceEventSchema = z
	.object({
		method: z.literal("StopFollowing"),
		timestamp: z.number(),
		users: z.array(StringOrNumberSchema),
	})
	.passthrough();

export const FollowPresenceEventSchema = z
	.object({
		method: z.literal("Follow"),
		timestamp: z.number(),
		user: StringOrNumberSchema,
	})
	.passthrough();

export const PresenceEventSchema = z.union([
	PointerMovePresenceEventSchema,
	SelectionPresenceEventSchema,
	SetUserColorPresenceEventSchema,
	DrawSelectPresenceEventSchema,
	CancelDrawSelectPresenceEventSchema,
	CameraPresenceEventSchema,
	PingPresenceEventSchema,
	BringToMePresenceEventSchema,
	StopFollowingPresenceEventSchema,
	FollowPresenceEventSchema,
]);

const TextActionSchema = z
	.object({
		action: z.enum([
			"adjust_text_length",
			"adjust_reading_level",
			"adjust_emojis",
		]),
		level: z.number(),
	})
	.passthrough();

const UserRequestAiChatEventSchema = z
	.object({
		method: z.literal("UserRequest"),
		context: z.array(z.number()),
		boardContext: z.array(z.string()),
		boardContextIds: StringArraySchema.optional(),
		idea: z.string(),
		model: z.string().optional(),
		images: z.array(z.string()).optional(),
		updatedFrom: z.number().optional(),
		itemId: z.string(),
		requestItemId: z.string(),
		action: TextActionSchema.optional(),
		contextRequest: z
			.object({
				messageId: z.string(),
				range: z.number().optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

const GenerateImageRequestAiChatEventSchema = z
	.object({
		method: z.literal("GenerateImage"),
		prompt: z.string(),
		itemId: z.string(),
		options: z.unknown(),
	})
	.passthrough();

const GenerateImageResponseAiChatEventSchema = z
	.object({
		method: z.literal("GenerateImage"),
		status: z.enum(["generating", "completed", "error"]),
		message: z.string().optional(),
		base64: z.string().nullable(),
		imageUrl: z.string().nullable(),
		itemId: z.string(),
		isExternalApiError: z.boolean().optional(),
	})
	.passthrough();

const GenerateAudioRequestAiChatEventSchema = z
	.object({
		method: z.literal("GenerateAudio"),
		text: z.string(),
		model: z.string(),
	})
	.passthrough();

const GenerateAudioResponseAiChatEventSchema = z
	.object({
		method: z.literal("GenerateAudio"),
		status: z.enum(["generating", "completed", "error"]),
		message: z.string().optional(),
		base64: z.string().nullable(),
		audioUrl: z.string().nullable(),
		isExternalApiError: z.boolean().optional(),
	})
	.passthrough();

const StopGenerationAiChatEventSchema = z
	.object({
		method: z.literal("StopGeneration"),
		itemId: z.string(),
	})
	.passthrough();

const ChatChunkAiChatEventSchema = z
	.object({
		method: z.literal("ChatChunk"),
		chatId: z.number(),
		type: z.enum(["chunk", "done", "end", "error"]),
		itemId: z.string(),
		content: z.string().optional(),
		error: z.string().optional(),
		isExternalApiError: z.boolean().optional(),
	})
	.passthrough();

export const AiChatEventSchema = z.union([
	UserRequestAiChatEventSchema,
	GenerateImageRequestAiChatEventSchema,
	GenerateImageResponseAiChatEventSchema,
	GenerateAudioRequestAiChatEventSchema,
	GenerateAudioResponseAiChatEventSchema,
	StopGenerationAiChatEventSchema,
	ChatChunkAiChatEventSchema,
]);

export const SocketBoardSnapshotSchema = z
	.object({
		items: z.array(z.unknown()),
		events: z.array(SocketSyncBoardEventSchema),
		lastIndex: z.number(),
	})
	.passthrough();

export const NormalizedBoardSnapshotSchema = z
	.object({
		items: z.array(z.unknown()),
		events: z.array(SocketSyncEventSchema),
		lastIndex: z.number(),
	})
	.passthrough();

export const AuthMsgSchema = z
	.object({
		type: z.literal("Auth"),
		jwt: z.string(),
	})
	.strict();

export const LogoutMsgSchema = z
	.object({
		type: z.literal("Logout"),
	})
	.strict();

export const InvalidateRightsMsgSchema = z
	.object({
		type: z.literal("InvalidateRights"),
		boardId: z.string(),
		byUser: z.boolean(),
	})
	.strict();

export const GetModeMsgSchema = z
	.object({
		type: z.literal("GetMode"),
		boardId: z.string(),
	})
	.strict();

export const SubscribeMsgSchema = z
	.object({
		type: z.literal("Subscribe"),
		boardId: z.string(),
		userId: z.string(),
		index: z.number(),
		accessKey: z.string().optional(),
	})
	.strict();

export const UnsubscribeMsgSchema = z
	.object({
		type: z.literal("Unsubscribe"),
		boardId: z.string(),
	})
	.strict();

export const ErrorMsgSchema = z
	.object({
		type: z.literal("Error"),
		message: z.string(),
		deniedBoardId: z.string().optional(),
		expectedSequence: z.number().optional(),
		receivedSequence: z.number().optional(),
	})
	.strict();

export const VersionCheckMsgSchema = z
	.object({
		type: z.literal("VersionCheck"),
		version: z.string(),
	})
	.strict();

export const AuthConfirmationMsgSchema = z
	.object({
		type: z.literal("AuthConfirmation"),
		sessionId: z.string().optional(),
	})
	.strict();

export const PingMsgSchema = z
	.object({
		type: z.literal("ping"),
	})
	.strict();

export const PongMsgSchema = z
	.object({
		type: z.literal("pong"),
	})
	.strict();

export const BoardAccessDeniedMsgSchema = z
	.object({
		type: z.literal("BoardAccessDenied"),
		boardId: z.string(),
	})
	.strict();

export const BoardSubscriptionCompletedMsgSchema = z
	.object({
		type: z.literal("BoardSubscriptionCompleted"),
		boardId: z.string(),
		mode: z.string(),
		sessionId: z.string().optional(),
		snapshot: z.string().nullable().optional(),
		JSONSnapshot: z.unknown().nullable().optional(),
		eventsSinceLastSnapshot: z.array(z.unknown()),
		initialSequenceNumber: z.number(),
	})
	.strict();

export const NormalizedBoardSubscriptionCompletedMsgSchema = z
	.object({
		type: z.literal("BoardSubscriptionCompleted"),
		boardId: z.string(),
		mode: z.enum(accessModeValues),
		sessionId: z.string().optional(),
		snapshot: z.string().nullable().optional(),
		JSONSnapshot: NormalizedBoardSnapshotSchema.nullable().optional(),
		eventsSinceLastSnapshot: z.array(SocketSyncEventSchema),
		initialSequenceNumber: z.number(),
	})
	.strict();

export const BoardSnapshotMsgSchema = z
	.object({
		type: z.literal("BoardSnapshot"),
		boardId: z.string(),
		snapshot: z.string(),
		lastEventOrder: z.number(),
	})
	.strict();

export const AiChatMsgSchema = z
	.object({
		type: z.literal("AiChat"),
		boardId: z.string(),
		event: AiChatEventSchema,
	})
	.strict();

export const BoardEventMsgSchema = z
	.object({
		type: z.literal("BoardEvent"),
		boardId: z.string(),
		event: SocketSyncEventSchema,
		sequenceNumber: z.number(),
		userId: z.string().optional(),
	})
	.strict();

export const ConfirmationMsgSchema = z
	.object({
		type: z.literal("Confirmation"),
		boardId: z.string(),
		sequenceNumber: z.number(),
		order: z.number(),
	})
	.strict();

export const ModeMsgSchema = z
	.object({
		type: z.literal("Mode"),
		boardId: z.string(),
		mode: z.enum(["view", "edit"]),
	})
	.strict();

export const SnapshotRequestMsgSchema = z
	.object({
		type: z.literal("CreateSnapshotRequest"),
		boardId: z.string(),
	})
	.strict();

export const UserJoinMsgSchema = z
	.object({
		type: z.literal("UserJoin"),
		timestamp: z.number(),
		userId: StringOrNumberSchema.optional(),
		sessionId: z.string().optional(),
		authorUserId: z.string().optional(),
		boardId: z.string(),
		snapshots: z.record(z.string(), z.unknown()),
	})
	.strict();

export const PresenceEventMsgSchema = z
	.object({
		type: z.literal("PresenceEvent"),
		boardId: z.string().optional(),
		event: PresenceEventSchema,
		userId: z.string().optional(),
		sessionId: z.string().optional(),
		authorUserId: z.string().optional(),
		softId: z.string().nullable(),
		hardId: z.string().nullable(),
		messageId: z.string(),
		nickname: z.string(),
		color: z.string().nullable(),
		avatar: z.string().nullable(),
	})
	.strict();

export const EventsMsgSchema = z.union([
	ModeMsgSchema,
	BoardEventMsgSchema,
	SnapshotRequestMsgSchema,
	ConfirmationMsgSchema,
	BoardSubscriptionCompletedMsgSchema,
	UserJoinMsgSchema,
	PresenceEventMsgSchema,
	AiChatMsgSchema,
	BoardSnapshotMsgSchema,
]);

export const SocketMsgSchema = z.union([
	EventsMsgSchema,
	AuthMsgSchema,
	AuthConfirmationMsgSchema,
	LogoutMsgSchema,
	GetModeMsgSchema,
	InvalidateRightsMsgSchema,
	SubscribeMsgSchema,
	UnsubscribeMsgSchema,
	VersionCheckMsgSchema,
	ErrorMsgSchema,
	PingMsgSchema,
	PongMsgSchema,
	BoardAccessDeniedMsgSchema,
]);

export const BoardWsHandshakeJwtPayloadSchema = z
	.object({
		boardId: z.string(),
		sessionId: z.string(),
		accessMode: z.enum(accessModeValues),
		isWsToken: z.literal(true),
	})
	.strict();

export const TemplateWsHandshakeJwtPayloadSchema = z
	.object({
		templateId: z.string(),
		connectionType: z.literal("template"),
		isWsToken: z.literal(true),
	})
	.strict();

export const BoardConnectResponseSchema = z
	.object({
		wsUrl: z.string(),
		jwt: z.string(),
		userId: z.string(),
		sessionId: z.string(),
		accessMode: z.enum(accessModeValues),
	})
	.strict();

export const TemplateConnectResponseSchema = z
	.object({
		wsUrl: z.string(),
		jwt: z.string(),
		userId: z.string(),
	})
	.strict();

export type SocketContractAuthMsg = z.infer<typeof AuthMsgSchema>;
export type SocketContractLogoutMsg = z.infer<typeof LogoutMsgSchema>;
export type SocketContractInvalidateRightsMsg = z.infer<
	typeof InvalidateRightsMsgSchema
>;
export type SocketContractGetModeMsg = z.infer<typeof GetModeMsgSchema>;
export type SocketContractSubscribeMsg = z.infer<typeof SubscribeMsgSchema>;
export type SocketContractUnsubscribeMsg = z.infer<typeof UnsubscribeMsgSchema>;
export type SocketContractErrorMsg = z.infer<typeof ErrorMsgSchema>;
export type SocketContractVersionCheckMsg = z.infer<typeof VersionCheckMsgSchema>;
export type SocketContractAuthConfirmationMsg = z.infer<
	typeof AuthConfirmationMsgSchema
>;
export type SocketContractPingMsg = z.infer<typeof PingMsgSchema>;
export type SocketContractPongMsg = z.infer<typeof PongMsgSchema>;
export type SocketContractBoardAccessDeniedMsg = z.infer<
	typeof BoardAccessDeniedMsgSchema
>;
export type SocketContractBoardSubscriptionCompletedMsg = z.infer<
	typeof BoardSubscriptionCompletedMsgSchema
>;
export type SocketContractNormalizedBoardSnapshot = z.infer<
	typeof NormalizedBoardSnapshotSchema
>;
export type SocketContractNormalizedBoardSubscriptionCompletedMsg = z.infer<
	typeof NormalizedBoardSubscriptionCompletedMsgSchema
>;
export type SocketContractBoardSnapshotMsg = z.infer<
	typeof BoardSnapshotMsgSchema
>;
export type SocketContractAiChatEvent = z.infer<typeof AiChatEventSchema>;
export type SocketContractAiChatMsg = z.infer<typeof AiChatMsgSchema>;
export type SocketContractBoardEventMsg = z.infer<typeof BoardEventMsgSchema>;
export type SocketContractConfirmationMsg = z.infer<typeof ConfirmationMsgSchema>;
export type SocketContractModeMsg = z.infer<typeof ModeMsgSchema>;
export type SocketContractSnapshotRequestMsg = z.infer<
	typeof SnapshotRequestMsgSchema
>;
export type SocketContractUserJoinMsg = z.infer<typeof UserJoinMsgSchema>;
export type SocketContractPresenceEvent = z.infer<typeof PresenceEventSchema>;
export type SocketContractPresenceEventMsg = z.infer<
	typeof PresenceEventMsgSchema
>;
export type SocketContractEventsMsg = z.infer<typeof EventsMsgSchema>;
export type SocketContractSocketMsg = z.infer<typeof SocketMsgSchema>;
export type SocketContractOperation = z.infer<typeof SocketOperationSchema>;
export type SocketContractAccessMode = z.infer<typeof AccessModeSchema>;
export type SocketContractBoardWsHandshakeJwtPayload = z.infer<
	typeof BoardWsHandshakeJwtPayloadSchema
>;
export type SocketContractTemplateWsHandshakeJwtPayload = z.infer<
	typeof TemplateWsHandshakeJwtPayloadSchema
>;
export type SocketContractBoardConnectResponse = z.infer<
	typeof BoardConnectResponseSchema
>;
export type SocketContractTemplateConnectResponse = z.infer<
	typeof TemplateConnectResponseSchema
>;

export function parseSocketMsg(data: unknown): SocketContractSocketMsg {
	return SocketMsgSchema.parse(data);
}

export function safeParseSocketMsg(data: unknown) {
	return SocketMsgSchema.safeParse(data);
}

export function parseEventsMsg(data: unknown): SocketContractEventsMsg {
	return EventsMsgSchema.parse(data);
}

export function parseOperation(data: unknown): SocketContractOperation {
	return SocketOperationSchema.parse(data);
}

export function parseBoardConnectResponse(
	data: unknown
): SocketContractBoardConnectResponse {
	return BoardConnectResponseSchema.parse(data);
}

export function parseTemplateConnectResponse(
	data: unknown
): SocketContractTemplateConnectResponse {
	return TemplateConnectResponseSchema.parse(data);
}

export function normalizeBoardSnapshot(
	data: unknown
): SocketContractNormalizedBoardSnapshot {
	return NormalizedBoardSnapshotSchema.parse(data);
}

export function normalizeBoardSubscriptionCompletedMsg(
	data: unknown
): SocketContractNormalizedBoardSubscriptionCompletedMsg {
	const parsed = BoardSubscriptionCompletedMsgSchema.parse(data);

	return NormalizedBoardSubscriptionCompletedMsgSchema.parse({
		...parsed,
		mode: z.enum(accessModeValues).parse(parsed.mode),
		JSONSnapshot:
			parsed.JSONSnapshot == null
				? parsed.JSONSnapshot
				: normalizeBoardSnapshot(parsed.JSONSnapshot),
		eventsSinceLastSnapshot: z.array(SocketSyncEventSchema).parse(
			parsed.eventsSinceLastSnapshot
		),
	});
}
