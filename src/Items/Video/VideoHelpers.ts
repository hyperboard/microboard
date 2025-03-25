import { fileTosha256 } from "shared/sha256";
import { prepareImage } from "Board/Items/Image/ImageHelpers";

// TODO move browser api
// export const storageURL = `${window.location.origin}/api/v1/video`;

export const uploadVideoToStorage = async (
	hash: string,
	videoBlob: Blob,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		fetch(`${window.location.origin}/api/v1/media/video`, {
			method: "POST",
			headers: {
				"Content-Type": videoBlob.type,
				"x-video-id": hash,
			},
			body: videoBlob,
		})
			.then(response => {
				if (response.status !== 200) {
					throw new Error(`HTTP status: ${response.status}`);
				}
				return response.json();
			})
			.then(data => {
				resolve(data.src);
			})
			.catch(error => {
				console.error("Media storage error:", error);
				reject(error);
			});
	});
};

export const prepareVideo = (
	file: File,
): Promise<{
	url: string;
	videoDimension: { width: number; height: number };
	previewUrl: string;
}> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.src = URL.createObjectURL(file);
		video.onloadedmetadata = () => {
			video.onseeked = () => {
				video.onseeked = null;
				prepareImage(captureFrame(0.1, video)?.src)
					.then(imageData => {
						const { videoWidth: width, videoHeight: height } =
							video;
						fileTosha256(file)
							.then(hash => {
								uploadVideoToStorage(hash, file)
									.then(url => {
										resolve({
											url,
											videoDimension: { width, height },
											previewUrl: imageData.storageLink,
										});
									})
									.catch(reject);
							})
							.catch(() => {
								reject(new Error("Failed to generate hash"));
							});
					})
					.catch(() =>
						reject(new Error("Failed to load video preview")),
					);
			};
			video.currentTime = 0.1;
		};
		video.onerror = () => {
			reject(new Error("Failed to load video"));
		};
	});
};

export const getYouTubeVideoPreview = (
	youtubeUrl: string,
): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const preview = document.createElement("img");
		preview.src = youtubeUrl;
		preview.onload = () => {
			resolve(preview);
		};
		preview.onerror = () => {
			reject(new Error("Failed to load preview"));
		};
	});
};

export const getYouTubeThumbnail = (videoId: string, quality = "maxres") => {
	const qualities = {
		maxres: "maxresdefault", // 1280x720
		sd: "sddefault", // 640x480
		hq: "hqdefault", // 480x360
		mq: "mqdefault", // 320x180
		default: "default", // 120x90
	};

	return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}.jpg`;
};

export const captureFrame = (
	frameTime: number,
	video: HTMLVideoElement,
): HTMLImageElement | null => {
	video.currentTime = frameTime;
	const canvas = document.createElement("canvas");
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const frame = new Image();
		frame.src = canvas.toDataURL();
		return frame;
	} else {
		return null;
	}
};
