import { fileTosha256 } from "shared/sha256";
import { Board } from "Board/Board";
import { AudioItem } from "Board/Items/Audio/Audio";
import { Matrix } from "Board/Items/Transformation/Matrix";
import { conf } from "Board/Settings";
import { catchErrorResponse } from "Board/Items/Image/ImageHelpers";

export const uploadAudioToStorage = async (
	hash: string,
	audioBlob: Blob,
	accessToken: string | null,
	boardId: string,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		fetch(`${window.location.origin}/api/v1/media/audio/${boardId}`, {
			method: "POST",
			headers: {
				"Content-Type": audioBlob.type,
				"x-audio-id": hash,
				Authorization: `Bearer ${accessToken}`,
			},
			body: audioBlob,
		})
			.then(async response => {
				if (response.status !== 200) {
					return catchErrorResponse(response, "audio");
				}
				return response.json();
			})
			.then(data => {
				console.log(data);
				resolve(data.src);
			})
			.catch(error => {
				console.error("Media storage error:", error);
				reject(error);
			});
	});
};

export const prepareAudio = (
	file: File,
	accessToken: string | null,
	boardId: string,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const audio = document.createElement("audio");
		audio.src = URL.createObjectURL(file);
		audio.onloadedmetadata = () => {
			fileTosha256(file)
				.then(hash => {
					uploadAudioToStorage(hash, file, accessToken, boardId)
						.then(url => {
							resolve(url);
						})
						.catch(reject);
				})
				.catch(() => {
					reject(new Error("Failed to generate hash"));
				});
		};
		audio.onerror = () => {
			reject(new Error("Failed to load audio"));
		};
	});
};

export const calculateAudioPosition = (board: Board, audioItem: AudioItem) => {
	const cameraMbr = board.camera.getMbr();
	const cameraWidth = cameraMbr.getWidth();
	const translateX = cameraMbr.left + cameraWidth * 0.2;
	const translateY = cameraMbr.getCenter().y - audioItem.getHeight() / 2;
	const scale = (cameraWidth * 0.6) / audioItem.getWidth();
	return new Matrix(translateX, translateY, scale, scale);
};
