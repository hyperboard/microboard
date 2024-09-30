import { Board } from "Board/Board";
import { ImageItem } from "./Image";
import { calculatePosition } from "./calculatePosition";
import { prepareImage } from "./ImageHelpers";
import * as PDFJS from "pdfjs-dist";
import { RenderParameters } from "pdfjs-dist/types/src/display/api";
PDFJS.GlobalWorkerOptions.workerSrc =
	"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.mjs";

export function uploadImage(file: File, board: Board) {
	const reader = new FileReader();

	if (file.type === "application/pdf") {
		reader.onload = event => {
			const typedarray = new Uint8Array(
				event.target?.result as ArrayBufferLike,
			);
			PDFJS.getDocument({ data: typedarray }).promise.then(
				pdf => {
					const maxPages = pdf.numPages;
					let pagesRendered = 0;
					let viewportYOffset = 0;
					let pageHeight;
					const renderPage = pageNum => {
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

							if (renderContext.canvasContext) {
								page.render(
									renderContext as RenderParameters,
								).promise.then(() => {
									pagesRendered++;
									const base64String =
										canvas.toDataURL("image/png");
									prepareImage(base64String)
										.then(imageData => {
											const image = new ImageItem(
												imageData,
											);
											const boardImage = board.add(image);
											boardImage.doOnceOnLoad(() => {
												const viewportMbr =
													board.camera.getMbr();
												const scale = 1;
												const viewportCenter =
													viewportMbr.getCenter();
												viewportCenter.y =
													viewportMbr.top;
												const offsetX =
													((pagesRendered - 1) % 2) *
														(scale *
															image.getWidth()) -
													(scale * image.getWidth()) /
														2;
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
													viewportYOffset +=
														pageHeight * scale;
												}

												if (pagesRendered < maxPages) {
													renderPage(pageNum + 1);
												}
											});
											canvas.remove();
										})
										.catch(er => {
											console.error(
												"Could not create pdf page:",
												er,
											);
											// TODO notification
										});
								});
							}
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
		reader.onload = (event: ProgressEvent<FileReader>) => {
			const base64String = event.target?.result as string;
			prepareImage(base64String)
				.then(imageData => {
					const image = new ImageItem(imageData);
					image.doOnceBeforeOnLoad(() => {
						const { scaleX, scaleY, translateX, translateY } =
							calculatePosition(image, board);
						image.transformation.applyTranslateTo(
							translateX,
							translateY,
						);
						image.transformation.applyScaleTo(scaleX, scaleY);
						image.updateMbr();
						const boardImage = board.add(image);
						board.selection.removeAll();
						board.selection.add(boardImage);
					});
				})
				.catch(er => {
					console.error("Could not create image:", er);
					// TODO notification
				});
		};
		reader.readAsDataURL(file);
	}
}
