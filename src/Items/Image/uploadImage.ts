import { Board } from "Board/Board";
import { ImageItem } from "./Image";

export function uploadImage(file: File, board: Board) {
	const reader = new FileReader();

	if (file.type === "application/pdf") {
		reader.onload = event => {
			const typedarray = new Uint8Array(
				event.target?.result as ArrayBufferLike,
			);
			pdfjsLib.getDocument({ data: typedarray }).promise.then(
				pdf => {
					const maxPages = pdf.numPages;
					let pagesRendered = 0;
					let viewportYOffset = 0;
					let pageHeight;
					let renderPage = pageNum => {
						pdf.getPage(pageNum).then(page => {
							const viewport = page.getViewport({
								scale: 1,
							});
							pageHeight = viewport.height;
							const canvas = document.createElement("canvas");
							const context = canvas.getContext("2d");
							canvas.height = viewport.height;
							canvas.width = viewport.width;

							const renderContext = {
								canvasContext: context,
								viewport: viewport,
							};
							page.render(renderContext).promise.then(() => {
								pagesRendered++;
								const base64String =
									canvas.toDataURL("image/png");
								const image = new ImageItem(base64String);
								const boardImage = board.add(image);
								boardImage.doOnceOnLoad(() => {
									const viewportMbr = board.camera.getMbr();
									const scale = 1;
									const viewportCenter =
										viewportMbr.getCenter();
									viewportCenter.y = viewportMbr.top;
									const offsetX =
										((pagesRendered - 1) % 2) *
											(scale * image.getWidth()) -
										(scale * image.getWidth()) / 2;
									const offsetY = viewportYOffset;
									const centeredX =
										viewportCenter.x + offsetX;
									const centeredY =
										viewportCenter.y + offsetY;
									boardImage.transformation.translateTo(
										centeredX,
										centeredY,
									);
									boardImage.transformation.scaleTo(
										scale,
										scale,
									);

									if (
										pageNum % 2 === 0 ||
										pageNum === maxPages
									) {
										viewportYOffset += pageHeight * scale;
									}

									if (pagesRendered < maxPages) {
										renderPage(pageNum + 1);
									}
								});
								canvas.remove();
							});
						});
					};

					renderPage(1);
				},
				reason => {
					console.error(reason);
				},
			);
		};
		reader.readAsArrayBuffer(file);
	} else {
		reader.onload = (event: any) => {
			const base64String = event.target.result;
			const image = new ImageItem(base64String);
			const boardImage = board.add(image);
			boardImage.doOnceOnLoad(() => {
				const viewportMbr = board.camera.getMbr();

				const viewportWidth = viewportMbr.getWidth();
				const viewportHeight = viewportMbr.getHeight();

				const margin = viewportHeight * 0.05;

				const viewportWidthWithMargin = viewportWidth - 2 * margin;
				const viewportHeightWithMargin = viewportHeight - 2 * margin;

				const imageWidth = boardImage.getWidth();
				const imageHeight = boardImage.getHeight();

				const scaleX = viewportWidthWithMargin / imageWidth;
				const scaleY = viewportHeightWithMargin / imageHeight;

				const scaleToFit = Math.min(scaleX, scaleY);

				const finalScale = scaleToFit;

				const scaledImageWidth = imageWidth * finalScale;
				const scaledImageHeight = imageHeight * finalScale;

				const scaledImageCenterX = scaledImageWidth / 2;
				const scaledImageCenterY = scaledImageHeight / 2;

				// Calculate the translation required to center the image.
				const centerPoint = viewportMbr.getCenter();
				const translateX = centerPoint.x - scaledImageCenterX;
				const translateY = centerPoint.y - scaledImageCenterY;
				boardImage.transformation.translateTo(translateX, translateY);
				boardImage.transformation.scaleTo(finalScale, finalScale);

				board.selection.removeAll();
				board.selection.add(boardImage);
			});
		};
		reader.readAsDataURL(file);
	}
}
