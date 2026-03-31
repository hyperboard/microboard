import { Board } from 'Board';
import { calculatePosition } from 'Items/Image/calculatePosition';
import { prepareImage } from 'Items/Image/ImageHelpers';
import { VideoConstructorData, VideoItem } from './Video';
import { transformOps } from '../Transformation/transformOps';
import {uploadMediaToStorage} from "api/MediaHelpers";

export const getVideoMetadata = (file: File): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.preload = 'metadata';

		video.onloadedmetadata = () => {
			const { videoWidth: width, videoHeight: height } = video;
			URL.revokeObjectURL(video.src); // Cleanup
			resolve({ width, height });
		};

		video.onerror = () => {
			URL.revokeObjectURL(video.src); // Cleanup
			reject(new Error('Failed to load video metadata'));
		};

		video.src = URL.createObjectURL(file);
	});
};

export const createVideoItem = (
	board: Board,
	extension: 'mp4' | 'webm',
	videoData: VideoConstructorData,
	onLoadCb: (video: VideoItem) => void
) => {
	const video = new VideoItem(videoData, board, board.events, '', extension);
	video.doOnceBeforeOnLoad(() => {
		const { scaleX, scaleY, translateX, translateY } = calculatePosition(video, board);
		video.apply(transformOps.translateTo(video, translateX, translateY));
		video.apply(transformOps.scaleTo(video, scaleX, scaleY));
		video.updateMbr();
		const boardVideo = board.add(video);
		board.selection.removeAll();
		board.selection.add(boardVideo);
		onLoadCb(boardVideo);
	});
};

export const prepareVideo = (
	file: File,
	boardId: string,
	baseUrl?: string
): Promise<{
	url: string;
	previewUrl: string;
}> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		video.src = URL.createObjectURL(file);
		video.onloadedmetadata = () => {
			video.onseeked = () => {
				video.onseeked = null;
				prepareImage(captureFrame(0.1, video)?.src, boardId, baseUrl)
					.then(imageData => {
						uploadMediaToStorage(file, boardId, "video", baseUrl)
							.then(url => {
								resolve({
									url,
									previewUrl: imageData.storageLink,
								});
							})
							.catch(reject);
					})
					.catch(() => reject(new Error('Failed to load video preview')));
			};
			video.currentTime = 0.1;
		};
		video.onerror = () => {
			reject(new Error('Failed to load video'));
		};
	});
};

export const getYouTubeVideoPreview = (youtubeUrl: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const preview = document.createElement('img');
		preview.src = youtubeUrl;
		preview.onload = () => {
			resolve(preview);
		};
		preview.onerror = () => {
			reject(new Error('Failed to load preview'));
		};
	});
};

const qualities = {
	maxres: 'maxresdefault', // 1280x720
	sd: 'sddefault', // 640x480
	hq: 'hqdefault', // 480x360
	mq: 'mqdefault', // 320x180
	default: 'default', // 120x90
} as const;

export const getYouTubeThumbnail = (videoId: string, quality: keyof typeof qualities = 'maxres') => {
	return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}.jpg`;
};

export const captureFrame = (
	frameTime: number,
	video: HTMLVideoElement
): HTMLImageElement | null => {
	video.currentTime = frameTime;
	const canvas = document.createElement('canvas');
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const frame = new Image();
		frame.src = canvas.toDataURL();
		return frame;
	} else {
		return null;
	}
};
