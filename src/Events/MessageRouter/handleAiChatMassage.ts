import { Board } from "Board";
import { Connector } from "Board/Items";
import { AINode } from "Board/Items/AINode";
import { AudioItem } from "Board/Items/Audio";
import { ImageItem } from "Board/Items/Image";
import { prepareImage } from "Board/Items/Image/ImageHelpers";
import { getControlPointData } from "Board/Selection/QuickAddButtons";
import { conf } from "Board/Settings";

export interface AiChatMsg<T = AiChatEventType> {
	type: "AiChat";
	boardId: string;
	event: T;
}

export type AiChatEventType =
	| UserRequest
	| ChatChunk
	| StopGeneration
	| GenerateImageRequest
	| GenerateImageResponse
	| GenerateAudioRequest;

export type OpenAIModels =
	| "gpt-3.5-turbo"
	| "gpt-4"
	| "gpt-4o"
	| "GPT-4o"
	| "gpt-4o-mini"
	| "GPT-4o mini"
	| "gpt-4-32k"
	| "gpt-3.5-turbo-0613"
	| "gpt-4-0613"
	| "gpt-3.5-turbo-16k"
	| "gpt-4-16k"
	| "o1-mini"
	| "o1"
	| ImageModels
	| CustomModels
	| TextToSpeechModels;

type ImageModels =
	| "dall-e-2"
	| "dall-e-3"
	| "midjourney"
	| "flux-schnell"
	| "flux-pro"
	| "recraft";

type TextToSpeechModels = "tts-1-hd";

type CustomModels =
	| "deepseek-chat"
	| "deepseek-reasoner"
	| "sonar-deep-research";

export interface UserRequest {
	method: "UserRequest";
	context: number[]; // chat message context
	boardContext: string[];
	boardContextIds?: string[]; // just for frontend
	idea: string;
	model?: OpenAIModels; // default gpt-4-turbo-preview
	images?: string[]; // only with 4o and later. Image link or base64. Better use: `data:{type};base64,${base64}`
	updatedFrom?: number; // "user" message id
	itemId: string;
	requestItemId: string;
	action?: TextAction;
	contextRequest?: {
		messageId: string;
		range?: number;
	};
}

export interface GenerateImageRequest {
	method: "GenerateImage";
	prompt: string;
	itemId: string;
	options:
		| {
				model: "dall-e-2";
				size: "256x256" | "512x512" | "1024x1024";
		  }
		| {
				model: "dall-e-3";
				size: "1024x1024" | "1792x1024" | "1024x1792";
				quality: "standard" | "hd";
		  }
		| {
				model: "midjourney";
		  }
		| {
				model: "flux-schnell" | "flux-pro";
				aspect_ratio: string; // "1:1"
		  };
}

export interface GenerateImageResponse {
	method: "GenerateImage";
	status: "generating" | "completed" | "error";
	message?: string;
	base64: string | null;
	imageUrl: string | null;
	itemId: string;
	isExternalApiError?: boolean;
}

export interface GenerateAudioRequest {
	method: "GenerateAudio";
	text: string;
	model: "tts-1-hd";
}

export interface GenerateAudioResponse {
	method: "GenerateAudio";
	status: "generating" | "completed" | "error";
	message?: string;
	base64: string | null;
	audioUrl: string | null;
	isExternalApiError?: boolean;
}

export type TTextAction =
	| "adjust_text_length"
	| "adjust_reading_level"
	| "adjust_emojis";
export interface TextAction {
	action: TTextAction;
	level: number;
}
export interface StopGeneration {
	method: "StopGeneration";
	itemId: string;
}

export interface ChatChunk {
	method: "ChatChunk";
	chatId: number;
	type: "chunk" | "done" | "end" | "error";
	itemId: string;
	content?: string;
	error?: string;
	isExternalApiError?: boolean;
}

export function handleAiChatMassage(message: AiChatMsg, board: Board): void {
	if (message.type === "AiChat") {
		const event = message.event;
		switch (event.method) {
			case "ChatChunk":
				handleChatChunk(event, board);
				break;
			case "GenerateImage":
				handleImageGenerate(event, board);
				break;
			case "GenerateAudio":
				handleAudioGenerate(event, board);
				break;
		}
	}
}

function handleChatChunk(chunk: ChatChunk, board: Board): void {
	const itemId = chunk.itemId;
	const item = board.items.getById(itemId);
	switch (chunk.type) {
		case "chunk":
			if (!item || item.itemType !== "AINode") {
				return;
			}
			item.text.editor.processMarkdown(chunk.content || "");
			break;
		case "done":
			if (!item || item.itemType !== "AINode") {
				board.aiGeneratingOnItem = undefined;
				return;
			}
			item.getRichText().editor.processMarkdown("StopProcessingMarkdown");
			break;
		case "end":
			if (!item || item.itemType !== "AINode") {
				board.aiGeneratingOnItem = undefined;
				return;
			}
			item.getRichText().editor.processMarkdown("StopProcessingMarkdown");
			break;
		case "error":
			board.camera.unsubscribeFromItem();
			if (board.aiGeneratingOnItem) {
				const item = board.items.getById(board.aiGeneratingOnItem);
				if (item) {
					board.selection.removeAll();
					board.selection.add(item);
					if (item.itemType === "AINode") {
						item.getRichText().editor.setStopProcessingMarkDownCb(
							null,
						);
						if (chunk.isExternalApiError) {
							const editor = item.getRichText().editor;
							editor.clearText();
							editor.insertCopiedText(
								conf.i18n.t("AIInput.nodeErrorText"),
							);
						}
					}
					board.camera.zoomToFit(item.getMbr(), 20);
				}
			}
			console.log("Error AI generate", chunk.error);
			if (!chunk.isExternalApiError) {
				conf.notify({
					header: conf.i18n.t("AIInput.textGenerationError.header"),
					body: conf.i18n.t("AIInput.textGenerationError.body"),
					variant: "error",
					duration: 4000,
				});
			}
			board.aiGeneratingOnItem = undefined;
			break;
		default:
			board.camera.unsubscribeFromItem();
			if (!chunk.isExternalApiError) {
				conf.notify({
					header: conf.i18n.t("AIInput.textGenerationError.header"),
					body: conf.i18n.t("AIInput.textGenerationError.body"),
					variant: "error",
					duration: 4000,
				});
			}
			if (board.aiGeneratingOnItem) {
				const item = board.items.getById(board.aiGeneratingOnItem);
				if (item) {
					board.selection.removeAll();
					board.selection.add(item);
					if (item.itemType === "AINode") {
						item.getRichText().editor.setStopProcessingMarkDownCb(
							null,
						);
						if (chunk.isExternalApiError) {
							const editor = item.getRichText().editor;
							editor.clearText();
							editor.insertCopiedText(
								conf.i18n.t("AIInput.nodeErrorText"),
							);
						}
					}
					board.camera.zoomToFit(item.getMbr(), 20);
				}
			}
			board.aiGeneratingOnItem = undefined;
	}
}

function handleAudioGenerate(
	response: GenerateAudioResponse,
	board: Board,
): void {
	function replacePlaceholderNode(
		audioUrl: string,
		bs64: string | null,
	): void {
		const connector = board.items.getById(
			board.aiImageConnectorID || "",
		) as Connector | undefined;
		const placeholderNode = board.items.getById(
			board.aiGeneratingOnItem || "",
		) as AINode | undefined;
		if (!placeholderNode || !connector) {
			if (bs64) {
				downloadAudio(bs64);
			}
			if (placeholderNode) {
				board.remove(placeholderNode);
			}
			if (connector) {
				board.remove(connector);
			}
			return;
		}

		const audio = new AudioItem(
			board,
			true,
			audioUrl,
			board.events,
			"",
			"wav",
		);
		const { left, top, right } = placeholderNode.getMbr();
		audio.transformation.applyTranslateTo(
			left + (right - left - conf.AUDIO_DIMENSIONS.width) / 2,
			top,
		);
		audio.updateMbr();
		const threadDirection = placeholderNode.getThreadDirection();
		board.remove(placeholderNode, false);
		const boardAudio = board.add(audio);
		board.selection.removeAll();
		board.selection.add(boardAudio);
		const reverseIndexMap = {
			0: 1,
			1: 0,
			2: 3,
			3: 2,
		};
		connector.setEndPoint(
			getControlPointData(boardAudio, reverseIndexMap[threadDirection]),
		);

		board.aiGeneratingOnItem = undefined;
		board.aiImageConnectorID = undefined;
	}

	function downloadAudio(bs64: string): void {
		const audioBlob = new Blob(
			[Uint8Array.from(window.atob(bs64), ch => ch.charCodeAt(0))],
			{ type: "audio/wav" },
		);
		const audioUrl = URL.createObjectURL(audioBlob);
		const linkElem = conf.documentFactory.createElement(
			"a",
		) as HTMLAnchorElement;
		linkElem.href = audioUrl;
		linkElem.setAttribute(
			"download",
			`${board.getBoardId()}-generated.wav`,
		);
		linkElem.click();
	}

	const { base64, audioUrl } = response;
	if (response.status === "completed" && (base64 || audioUrl)) {
		if (audioUrl) {
			replacePlaceholderNode(audioUrl, base64);
		} else if (base64) {
			downloadAudio(base64);
		}
	} else if (response.status === "error") {
		const placeholderNode = board.items.getById(
			board.aiImageConnectorID || "",
		);
		if (placeholderNode) {
			board.selection.removeAll();
			board.selection.add(placeholderNode);
		}

		console.error("Audio generation error:", response.message);
		conf.notify({
			header: conf.i18n.t("AIInput.audioGenerationError.header"),
			body: conf.i18n.t("AIInput.audioGenerationError.body"),
			variant: "error",
			duration: 4000,
		});
	}
}

function handleImageGenerate(
	response: GenerateImageResponse,
	board: Board,
): void {
	if (response.status === "completed" && response.base64) {
		prepareImage(
			response.base64,
			account?.accessToken || null,
			board.getBoardId(),
		)
			.then(imageData => {
				const placeholderId = board.aiImagePlaceholder?.getId();
				if (placeholderId) {
					const placeholderNode = board.items.getById(placeholderId);
					if (placeholderNode) {
						const imageItem = new ImageItem(
							{
								base64: imageData.base64,
								imageDimension: imageData.imageDimension,
								storageLink: imageData.storageLink,
							},
							board,
							board.events,
						);
						const placeholderMbr = placeholderNode.getMbr();
						const placeholderCenterX =
							placeholderMbr.left + placeholderMbr.getWidth() / 2;

						const imageCenterX =
							placeholderCenterX -
							imageData.imageDimension.width / 2;
						const imageTopY = placeholderMbr.top;
						// error
						imageItem.transformation.translateTo(
							imageCenterX,
							imageTopY,
						);
						imageItem.setId(placeholderId);
						let threadDirection = 3;
						if (placeholderNode.itemType === "AINode") {
							threadDirection =
								placeholderNode.getThreadDirection();
						}
						board.remove(placeholderNode, false);
						const newImageAI = board.add(imageItem);

						newImageAI.doOnceOnLoad(() => {
							if (board.aiImageConnectorID) {
								const oldIdConnector = board.items.getById(
									board.aiImageConnectorID,
								) as Connector;

								const reverseIndexMap = {
									0: 1,
									1: 0,
									2: 3,
									3: 2,
								};
								oldIdConnector.setEndPoint(
									getControlPointData(
										newImageAI,
										reverseIndexMap[threadDirection],
									),
								);
							}
							board.selection.removeAll();
							board.selection.add(newImageAI);
							board.camera.zoomToFit(newImageAI.getMbr());
						});
					}
				}
				board.aiGeneratingOnItem = undefined;
			})
			.catch(er => {
				console.error("Could not create image from response:", er);
			});
		board.aiGeneratingOnItem = undefined;
		return;
	} else if (response.status === "error") {
		console.error("Image generation error:", response.message);
		if (response.isExternalApiError) {
			if (board.aiGeneratingOnItem) {
				const item = board.items.getById(board.aiGeneratingOnItem);
				if (item) {
					board.selection.removeAll();
					board.selection.add(item);
					const editor = item.getRichText()?.editor;
					editor?.clearText();
					editor?.insertCopiedText(
						conf.i18n.t("AIInput.nodeErrorText"),
					);
					board.camera.zoomToFit(item.getMbr(), 20);
				}
			}
		} else {
			conf.notify({
				header: conf.i18n.t("AIInput.imageGenerationError.header"),
				body: conf.i18n.t("AIInput.imageGenerationError.body"),
				variant: "error",
				duration: 4000,
			});
		}
		board.aiGeneratingOnItem = undefined;
	} else {
		console.warn("Unhandled image generation status:", response.status);
	}
}
