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
	storageLink: string;
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
						.then(storageLink => {
							resolve({
								storageLink,
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
