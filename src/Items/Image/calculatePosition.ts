import type { Board } from "Board/Board";
import type { ImageItem } from "./Image";
import { VideoItem } from "Board/Items/Video/Video";
import { tempStorage } from "App/SessionStorage";

export function calculatePosition(
	boardImage: ImageItem | VideoItem,
	board: Board,
): { scaleX: number; scaleY: number; translateX: number; translateY: number } {
	const viewportMbr = board.camera.getMbr();

	const viewportWidth = viewportMbr.getWidth();
	const viewportHeight = viewportMbr.getHeight();
	const centerPoint = viewportMbr.getCenter();

	const imageWidth = boardImage.getWidth();
	const imageHeight = boardImage.getHeight();

	const prevDimensions = tempStorage.getImageDimensions();
	if (prevDimensions) {
		const scaleX = prevDimensions.width / imageWidth;
		const scaleY = prevDimensions.height / imageHeight;
		const finalScale = Math.min(scaleX, scaleY);
		return {
			scaleX: finalScale,
			scaleY: finalScale,
			translateX: centerPoint.x - (imageWidth * finalScale) / 2,
			translateY: centerPoint.y - (imageHeight * finalScale) / 2,
		};
	}

	const margin = viewportHeight * 0.05;

	const viewportWidthWithMargin = viewportWidth - 2 * margin;
	const viewportHeightWithMargin = viewportHeight - 2 * margin;

	const scaleX = viewportWidthWithMargin / imageWidth;
	const scaleY = viewportHeightWithMargin / imageHeight;

	const scaleToFit = Math.min(scaleX, scaleY);

	const finalScale = scaleToFit;

	const scaledImageWidth = imageWidth * finalScale;
	const scaledImageHeight = imageHeight * finalScale;

	tempStorage.setImageDimensions({
		width: scaledImageWidth,
		height: scaledImageHeight,
	});

	const scaledImageCenterX = scaledImageWidth / 2;
	const scaledImageCenterY = scaledImageHeight / 2;

	// Calculate the translation required to center the image.
	const translateX = centerPoint.x - scaledImageCenterX;
	const translateY = centerPoint.y - scaledImageCenterY;

	return { scaleX: finalScale, scaleY: finalScale, translateX, translateY };
}
