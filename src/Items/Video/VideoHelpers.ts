import { sha256 } from "shared/sha256";

export const storageURL = `${window.location.origin}/api/v1/video`;

export const uploadVideoToStorage = async (
	hash: string,
	videoBlob: Blob,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		fetch(storageURL, {
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
}> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.src = URL.createObjectURL(file);
		video.onloadedmetadata = () => {
			const { videoWidth: width, videoHeight: height } = video;
			sha256(file)
				.then(hash => {
					uploadVideoToStorage(hash, file)
						.then(url => {
							resolve({
								url,
								videoDimension: { width, height },
							});
						})
						.catch(reject);
				})
				.catch(() => {
					reject(new Error("Failed to generate hash"));
				});
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

export const getYouTubeThumbnail = (
	videoId: string,
	quality: string = "maxres",
) => {
	const qualities = {
		maxres: "maxresdefault", // 1280x720
		sd: "sddefault", // 640x480
		hq: "hqdefault", // 480x360
		mq: "mqdefault", // 320x180
		default: "default", // 120x90
	};

	return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}.jpg`;
};
