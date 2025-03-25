import { sha256 } from "shared/sha256";
import { ImageConstructorData } from "./Image";
import { getDOMParser } from "Board/api/DOMParser";

// export const storageURL = `${window?.location.origin}/api/v1/media`;

export const uploadToTheStorage = async (
	hash: string,
	dataURL: string,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const base64String = dataURL.split(",")[1];
		const mimeType = dataURL.split(",")[0].split(":")[1].split(";")[0];
		// const buffer = Buffer.from(base64String, "base64");
		// const blob = new Blob([buffer], { type: mimeType });
		// Window Smell: window
		const binaryString = window.atob(base64String);
		const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
		const blob = new Blob([bytes], { type: mimeType });
		// fetch(storageURL, {
		fetch(`${window?.location.origin}/api/v1/media`, {
			method: "POST",
			headers: {
				"Content-Type": mimeType,
				"X-Image-Id": hash,
			},
			body: blob,
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

export const resizeAndConvertToPng = async (
	inp: string | ArrayBuffer | null | undefined,
): Promise<{
	dataURL: string;
	width: number;
	height: number;
	hash: string;
}> => {
	return new Promise((resolve, reject) => {
		if (typeof inp !== "string") {
			return reject("Can't process such input");
		}
		const base64String = inp;
		const image = new Image();
		image.src = base64String;
		image.onerror = () => {
			return reject("Failed to load image");
		};

		if (base64String.startsWith("data:image/svg+xml")) {
			image.onload = async () => {
				const parser = getDOMParser();
				const svgDoc = parser.parseFromString(
					atob(base64String.split(",")[1]),
					"image/svg+xml",
				);
				const svgElement = svgDoc.documentElement;

				svgElement.removeAttribute("width");
				svgElement.removeAttribute("height");

				if (!svgElement.getAttribute("viewBox")) {
					svgElement.setAttribute(
						"viewBox",
						`0 0 ${image.width} ${image.height}`,
					);
				}

				svgElement.setAttribute("width", `${image.width}`);
				svgElement.setAttribute("height", `${image.height}`);

				svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

				const newSvgString = new XMLSerializer().serializeToString(
					svgElement,
				);
				const newBase64 = `data:image/svg+xml;base64,${btoa(
					newSvgString,
				)}`;

				sha256(newBase64)
					.then(hash => {
						resolve({
							dataURL: newBase64,
							width: image.width,
							height: image.height,
							hash: `${hash}.svg`,
						});
					})
					.catch(() => {
						return reject(new Error("Failed to generate hash"));
					});
			};
		} else {
			image.onload = async () => {
				const canvas = document.createElement("canvas");
				const context = canvas.getContext("2d");
				if (!context) {
					return reject("Failed to get canvas context");
				}

				const { width, height } = image;
				const scale = 1920 / Math.max(width, height);
				const canvasWidth =
					width > 1920 || height > 1920 ? width * scale : width;
				const canvasHeight =
					width > 1920 || height > 1920 ? height * scale : height;

				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
				context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

				const dataURL = canvas.toDataURL("image/webp");
				sha256(dataURL)
					.then(hash => {
						resolve({
							dataURL,
							width: canvasWidth,
							height: canvasHeight,
							hash,
						});
					})
					.catch(() => {
						return reject(new Error("Failed to generate hash"));
					});
			};
		}
	});
};

/** Resizes if needed and converts image to png and uploads the image to the storage, doesnt throw on unsuccess
 * @param inp - The input image data
 * @returns An object containing prepared image information on success, err otherwise
 */
export const prepareImage = (
	inp: string | ArrayBuffer | null | undefined,
): Promise<ImageConstructorData> =>
	resizeAndConvertToPng(inp).then(({ width, height, dataURL, hash }) => {
		return uploadToTheStorage(hash, dataURL).then(src => {
			return {
				imageDimension: { width, height },
				base64: dataURL,
				storageLink: src,
			};
		});
	});
