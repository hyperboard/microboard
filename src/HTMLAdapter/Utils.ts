import { DocumentFactory } from "api/DocumentFactory";
import { Path, Paths } from "Geometry/Path";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { conf } from "Settings";

export function getTranslationFromHTML(el: HTMLElement): [number, number] {
	const transform = el.style.transform;
	const translateMatch = transform.match(/translate\(([^)]+)\)/);
	const [translateX, translateY] = translateMatch
		? translateMatch[1].split(",").map(value => parseFloat(value))
		: [0, 0];

	return [translateX, translateY];
}

export function getScaleFromHTML(el: HTMLElement): [number, number] {
	const transform = el.style.transform;
	const scaleMatch = transform.match(/scale\(([^)]+)\)/);
	const [scaleX, scaleY] = scaleMatch
		? scaleMatch[1].split(",").map(value => parseFloat(value))
		: [1, 1];

	return [scaleX, scaleY];
}

export function translateElementBy(
	el: HTMLElement,
	x: number,
	y: number,
): HTMLElement {
	const [exX, exY] = getTranslationFromHTML(el);
	const [newX, newY] = [exX + x, exY + y];

	const [scaleX, scaleY] = getScaleFromHTML(el);
	el.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleX}, ${scaleY})`;

	return el;
}

export function scaleElementBy(
	el: HTMLElement,
	scaleX: number,
	scaleY: number,
): HTMLElement {
	const [currentScaleX, currentScaleY] = getScaleFromHTML(el);
	const [newScaleX, newScaleY] = [
		currentScaleX * scaleX,
		currentScaleY * scaleY,
	];

	const [translateX, translateY] = getTranslationFromHTML(el);
	el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${newScaleX}, ${newScaleY})`;

	return el;
}

export function resetElementScale(el: HTMLElement): HTMLElement {
	const [x, y] = getTranslationFromHTML(el);

	el.style.transform = `translate(${x}px, ${y}px) scale(1, 1)`;
	return el;
}

export function positionRelatively(
	toPosition: HTMLElement,
	positionBy: HTMLElement,
	padding = 0,
): HTMLElement {
	const [translateX, translateY] = getTranslationFromHTML(toPosition);
	const [frameX, frameY] = getTranslationFromHTML(positionBy);
	const [dx, dy] = [translateX - frameX, translateY - frameY];
	const verticalAlignment = toPosition.getAttribute(
		"data-vertical-alignment",
	);
	const horizontalAlignment = toPosition.getAttribute(
		"data-vertical-alignment",
	);
	let paddingX = padding;
	let paddingY = padding;
	if (verticalAlignment && verticalAlignment === "bottom") {
		paddingY = -padding;
	}
	if (horizontalAlignment && horizontalAlignment === "right") {
		paddingX = -padding;
	}

	const [scaleX, scaleY] = getScaleFromHTML(toPosition);
	toPosition.style.transform = `translate(${dx + paddingX}px, ${dy + paddingY}px) scale(${scaleX}, ${scaleY})`;

	return toPosition;
}

export function positionAbsolutely(
	toPosition: HTMLElement,
	positionBy: HTMLElement,
): HTMLElement {
	const [translateX, translateY] = getTranslationFromHTML(toPosition);
	const [frameX, frameY] = getTranslationFromHTML(positionBy);
	const [dx, dy] = [translateX + frameX, translateY + frameY];

	const [scaleX, scaleY] = getScaleFromHTML(toPosition);
	toPosition.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

	return toPosition;
}

// }

export function renderPathToHTML(
    path: Path | Paths,
    documentFactory: DocumentFactory
): SVGPathElement | SVGPathElement[] {
    if (path instanceof Path) {
        const svgPath = documentFactory.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        ) as SVGPathElement;
        svgPath.setAttribute("d", path.getSvgPath());
        svgPath.setAttribute("fill", path.getBackgroundColor() || "none");
        svgPath.setAttribute("fill-opacity", (path as any).backgroundOpacity?.toString() || "1");
        svgPath.setAttribute("stroke", path.getBorderColor() || "none");
        svgPath.setAttribute("stroke-width", path.getBorderWidth().toString());
        svgPath.setAttribute("vector-effect", "non-scaling-stroke");
        return svgPath;
    } else {
        return path.getPaths().map((p) => renderPathToHTML(p, documentFactory) as SVGPathElement);
    }
}

export function renderLinkToHTML(
    linkTo: LinkTo,
    documentFactory: DocumentFactory
): HTMLElement {
    const div = documentFactory.createElement("link-item");
    div.classList.add("link-object");
    div.id = (linkTo as any).id || "";
    div.style.width = `24px`;
    div.style.height = `24px`;
    div.style.transformOrigin = "top left";
    div.style.position = "absolute";
    div.style.backgroundColor = "#FFFFFF";
    div.style.borderRadius = "2px";
    div.style.zIndex = "1";
    const link = documentFactory.createElement("a") as HTMLAnchorElement;
    link.style.position = "absolute";
    link.style.width = `100%`;
    link.style.height = `100%`;
    link.style.borderRadius = "2px";
    link.style.display = "flex";
    link.style.justifyContent = "center";
    link.style.alignItems = "center";
    link.setAttribute("target", "_blank");
    if (linkTo.link) {
        link.href = linkTo.link;
        const image = documentFactory.createElement("img") as HTMLImageElement;
        image.id = (linkTo as any).id || "";
        image.classList.add("link-image");
        image.src = `${new URL(linkTo.link).origin}/favicon.ico`;
        image.width = 20;
        image.height = 20;
        image.style.display = "block";
        link.appendChild(image);
    }

    div.appendChild(link);
    return div;
}
