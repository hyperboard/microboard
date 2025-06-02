import { sha256 } from 'sha256';
import { ImageConstructorData } from './Image';
import { conf } from 'Settings';
import { Account } from 'entities/account/Account';

// export const storageURL = `${window?.location.origin}/api/v1/media`;

export const catchErrorResponse = async (
	response: Response,
	mediaType: 'image' | 'video' | 'audio'
) => {
	if (response.status === 403) {
		const data = await response.json();
		let errorBody = conf.i18n.t('toolsPanel.addMedia.limitReached.bodyWithoutLimit');
		if (!data.isOwnerRequest) {
			errorBody = conf.i18n.t('toolsPanel.addMedia.limitReached.bodyOwner');
		} else if (data.currentUsage && data.storageLimit) {
			errorBody = conf.i18n.t(
				`toolsPanel.addMedia.limitReached.body.${
					parseInt(data.storageLimit) < 100_000 ? 'basic' : 'plus'
				}`
			);
		}
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.limitReached.header'),
			body: errorBody,
			button:
				data.isOwnerRequest && data.storageLimit <= 100
					? {
							text: conf.i18n.t('toolsPanel.addMedia.upgradeToPlus'),
							onClick: () => conf.openModal('USER_PLAN_MODAL_ID'),
					  }
					: undefined,
			duration: 8000,
		});
	} else if (response.status === 413) {
		const data = await response.json();
		let errorBody = conf.i18n.t('toolsPanel.addMedia.tooLarge.bodyWithoutLimit');
		let isBasicPlan = false;
		if (data.fileSizeLimit && data.fileSize) {
			if (mediaType === 'image') {
				isBasicPlan = parseInt(data.fileSizeLimit) < 20;
				errorBody = conf.i18n.t(
					`toolsPanel.addMedia.tooLarge.imageBody.${isBasicPlan ? 'basic' : 'plus'}`
				);
			} else {
				isBasicPlan = parseInt(data.fileSizeLimit) < 1000;
				errorBody = conf.i18n.t(
					`toolsPanel.addMedia.tooLarge.audioOrVideoBody.${
						isBasicPlan ? 'basic' : 'plus'
					}`
				);
			}
		}
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.tooLarge.header'),
			body: errorBody,
			button: isBasicPlan
				? {
						text: conf.i18n.t('toolsPanel.addMedia.upgradeToPlus'),
						onClick: () => conf.openModal('USER_PLAN_MODAL_ID'),
				  }
				: undefined,
			duration: 4000,
		});
	} else if (response.status === 401) {
		conf.openModal('MEDIA_UNAVAILABLE_MODAL_ID');
	} else if (response.status === 415) {
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.unsupportedFormat.header'),
			body: conf.i18n.t('toolsPanel.addMedia.unsupportedFormat.body'),
			duration: 4000,
		});
	} else {
		conf.notify({
			variant: 'error',
			header: conf.i18n.t('toolsPanel.addMedia.unhandled.header'),
			body: conf.i18n.t('toolsPanel.addMedia.unhandled.body'),
			duration: 4000,
		});
	}
	throw new Error(`HTTP status: ${response.status}`);
};

export const catchDuplicateErrorResponse = async (response: Response) => {
	if (response.status === 403) {
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.limitReached.header'),
			body: conf.i18n.t('toolsPanel.addMedia.limitReached.duplicateBody'),
			duration: 4000,
		});
	} else {
		conf.notify({
			variant: 'error',
			header: conf.i18n.t('toolsPanel.addMedia.unhandled.header'),
			body: conf.i18n.t('toolsPanel.addMedia.unhandled.body'),
			duration: 4000,
		});
	}
	throw new Error(`HTTP status: ${response.status}`);
};

export const validateMediaFile = (file: File, account: Account): boolean => {
	const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
	if (
		!file.type.startsWith('image') &&
		!conf.AUDIO_FORMATS.includes(fileExtension) &&
		!conf.VIDEO_FORMATS.includes(fileExtension)
	) {
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.unsupportedFormat.header'),
			body: conf.i18n.t('toolsPanel.addMedia.unsupportedFormat.body'),
			duration: 4000,
		});
		return false;
	}

	const isBasicPlan = account.billingInfo?.plan.name === 'basic';
	let errorBody = conf.i18n.t(
		`toolsPanel.addMedia.tooLarge.imageBody.${isBasicPlan ? 'basic' : 'plus'}`
	);

	if (conf.AUDIO_FORMATS.includes(fileExtension) || conf.VIDEO_FORMATS.includes(fileExtension)) {
		errorBody = conf.i18n.t(
			`toolsPanel.addMedia.tooLarge.audioOrVideoBody.${isBasicPlan ? 'basic' : 'plus'}`
		);
		if (file.size / 1024 ** 2 > (account.billingInfo?.storage.maxMediaSize || Infinity)) {
			conf.notify({
				variant: 'warning',
				header: conf.i18n.t('toolsPanel.addMedia.tooLarge.header'),
				body: errorBody,
				button: isBasicPlan
					? {
							text: conf.i18n.t('toolsPanel.addMedia.upgradeToPlus'),
							onClick: () => conf.openModal('USER_PLAN_MODAL_ID'),
					  }
					: undefined,
				duration: 4000,
			});
			return false;
		}
	} else if (file.size / 1024 ** 2 > (account.billingInfo?.storage.maxImageSize || Infinity)) {
		conf.notify({
			variant: 'warning',
			header: conf.i18n.t('toolsPanel.addMedia.tooLarge.header'),
			body: errorBody,
			button: isBasicPlan
				? {
						text: conf.i18n.t('toolsPanel.addMedia.upgradeToPlus'),
						onClick: () => conf.openModal('USER_PLAN_MODAL_ID'),
				  }
				: undefined,
			duration: 4000,
		});
		return false;
	}
	return true;
};

export const deleteMedia = async (mediaIds: string[], boardId: string): Promise<void> => {
	fetch(`${window?.location.origin}/api/v1/media/usage/${boardId}`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({ mediaIds, shouldIncrease: false }),
	}).catch(error => {
		console.error('Media storage error:', error);
	});
};

export const updateMediaUsage = async (mediaIds: string[], boardId: string): Promise<boolean> => {
	try {
		const response = await fetch(`${window?.location.origin}/api/v1/media/usage/${boardId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ mediaIds, shouldIncrease: true }),
		});

		if (response.status !== 200) {
			await catchDuplicateErrorResponse(response);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Media storage error:', error);
		return false;
	}
};

export const uploadToTheStorage = async (
	hash: string,
	dataURL: string,
	accessToken: string | null,
	boardId: string
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const base64String = dataURL.split(',')[1];
		const mimeType = dataURL.split(',')[0].split(':')[1].split(';')[0];
		// const buffer = Buffer.from(base64String, "base64");
		// const blob = new Blob([buffer], { type: mimeType });
		// Window Smell: window
		const binaryString = window.atob(base64String);
		const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
		const blob = new Blob([bytes], { type: mimeType });
		// fetch(storageURL, {
		fetch(`${window?.location.origin}/api/v1/media/image/${boardId}`, {
			method: 'POST',
			headers: {
				'Content-Type': mimeType,
				'X-Image-Id': hash,
				Authorization: `Bearer ${accessToken}`,
			},
			body: blob,
		})
			.then(async response => {
				if (response.status !== 200) {
					return catchErrorResponse(response, 'image');
				}
				return response.json();
			})
			.then(data => {
				resolve(data.src);
			})
			.catch(error => {
				console.error('Media storage error:', error);
				reject(error);
			});
	});
};

export const resizeAndConvertToPng = async (
	inp: string | ArrayBuffer | null | undefined
): Promise<{
	dataURL: string;
	width: number;
	height: number;
	hash: string;
}> => {
	return new Promise((resolve, reject) => {
		if (typeof inp !== 'string') {
			return reject("Can't process such input");
		}
		const base64String = inp;
		const image = new Image();
		image.src = base64String;
		image.onerror = () => {
			return reject('Failed to load image');
		};

		if (base64String.startsWith('data:image/svg+xml')) {
			image.onload = async () => {
				const parser = conf.getDOMParser();
				const svgDoc = parser.parseFromString(
					atob(base64String.split(',')[1]),
					'image/svg+xml'
				);
				const svgElement = svgDoc.documentElement;

				svgElement.removeAttribute('width');
				svgElement.removeAttribute('height');

				if (!svgElement.getAttribute('viewBox')) {
					svgElement.setAttribute('viewBox', `0 0 ${image.width} ${image.height}`);
				}

				svgElement.setAttribute('width', `${image.width}`);
				svgElement.setAttribute('height', `${image.height}`);

				svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

				const newSvgString = new XMLSerializer().serializeToString(svgElement);
				const newBase64 = `data:image/svg+xml;base64,${btoa(newSvgString)}`;

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
						return reject(new Error('Failed to generate hash'));
					});
			};
		} else {
			image.onload = async () => {
				const canvas = document.createElement('canvas');
				const context = canvas.getContext('2d');
				if (!context) {
					return reject('Failed to get canvas context');
				}

				const { width, height } = image;
				const scale = 1920 / Math.max(width, height);
				const canvasWidth = width > 1920 || height > 1920 ? width * scale : width;
				const canvasHeight = width > 1920 || height > 1920 ? height * scale : height;

				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
				context.drawImage(image, 0, 0, canvasWidth, canvasHeight);

				const dataURL = canvas.toDataURL('image/webp');
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
						return reject(new Error('Failed to generate hash'));
					});
			};
		}
	});
};

/** Resizes if needed and converts image to png and uploads the image to the storage, doesnt throw on unsuccess
 * @param inp - The input image data
 * @param accessToken
 * @param boardId
 * @returns An object containing prepared image information on success, err otherwise
 */
export const prepareImage = (
	inp: string | ArrayBuffer | null | undefined,
	accessToken: string | null,
	boardId: string
): Promise<ImageConstructorData> =>
	resizeAndConvertToPng(inp).then(({ width, height, dataURL, hash }) => {
		return uploadToTheStorage(hash, dataURL, accessToken, boardId).then(src => {
			return {
				imageDimension: { width, height },
				base64: dataURL,
				storageLink: src,
			};
		});
	});
