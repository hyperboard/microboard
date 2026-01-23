import { Board } from 'Board';
import { AudioItem } from 'Items/Audio/Audio';
import { Matrix } from 'Items/Transformation/Matrix';
import {uploadMediaToStorage} from "api/MediaHelpers";

export const prepareAudio = (
	file: File,
	accessToken: string | null,
	boardId: string,
	baseUrl?: string
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const audio = document.createElement('audio');
		audio.src = URL.createObjectURL(file);
		audio.onloadedmetadata = () => {
			uploadMediaToStorage(file, accessToken, boardId, "audio", baseUrl)
				.then(url => {
					resolve(url);
				})
				.catch(reject);
		};
		audio.onerror = () => {
			reject(new Error('Failed to load audio'));
		};
	});
};

export const calculateAudioPosition = (board: Board, audioItem: AudioItem) => {
	const cameraMbr = board.camera.getMbr();
	const cameraWidth = cameraMbr.getWidth();
	const translateX = cameraMbr.left + cameraWidth * 0.34;
	const translateY = cameraMbr.getCenter().y - audioItem.getHeight() / 2;
	const scale = (cameraWidth * 0.32) / audioItem.getWidth();
	return new Matrix(translateX, translateY, scale, scale);
};
