/* eslint-disable max-classes-per-file, @typescript-eslint/no-useless-constructor */
class RichTextElement extends HTMLElement {
    constructor() {
        super();
    }
}

class ShapeItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class StickerElement extends HTMLElement {
    constructor() {
        super();
    }
}

class DrawingElement extends HTMLElement {
    constructor() {
        super();
    }
}

class ConnectorElement extends HTMLElement {
    constructor() {
        super();
    }
}

class FrameItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class ImageItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class LinkItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class AINodeItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class VideoItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

class CommentElement extends HTMLElement {
    constructor() {
        super();
    }
}

class AudioItemElement extends HTMLElement {
    constructor() {
        super();
    }
}

customElements.define("rich-text", RichTextElement);
customElements.define("shape-item", ShapeItemElement);
customElements.define("sticker-item", StickerElement);
customElements.define("drawing-item", DrawingElement);
customElements.define("connector-item", ConnectorElement);
customElements.define("frame-item", FrameItemElement);
customElements.define("image-item", ImageItemElement);
customElements.define("link-item", LinkItemElement);
customElements.define("ainode-item", AINodeItemElement);
customElements.define("video-item", VideoItemElement);
customElements.define("comment-item", CommentElement);
customElements.define("audio-item", AudioItemElement);

document.addEventListener("DOMContentLoaded", () => {
    const itemsDiv = document.querySelector("#items");
    if (!itemsDiv) {
        console.error("ITEMS DIV NOT FOUND!");
        return;
    }
    let isDragging = false;
    let startX, startY;
    let translateX = 0;
    let translateY = 0;
    let scale = 1;

    itemsDiv.style.transformOrigin = "0 0";
    document.body.style.cursor = "grab";

    function updateTransform() {
        itemsDiv.style.transform =
            "translate(" +
            translateX +
            "px, " +
            translateY +
            "px) scale(" +
            scale +
            ")";
    }

    function handleMouseDown(ev) {
        isDragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        itemsDiv.style.cursor = "grabbing";
    }

    function handleMouseMove(ev) {
        if (!isDragging) {
            return;
        }
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        startX += dx;
        startY += dy;
        translateX += dx;
        translateY += dy;
        updateTransform();
    }

    function handleMouseUp(ev) {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        itemsDiv.style.cursor = "grab";
    }

    function handleWheel(ev) {
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.1 : 0.9;
        translateX = ev.clientX - (ev.clientX - translateX) * factor;
        translateY = ev.clientY - (ev.clientY - translateY) * factor;
        scale *= factor;
        updateTransform();
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("wheel", handleWheel, { passive: false });

    const titlePanel = document.createElement("div");
    titlePanel.style.boxShadow = "0px 10px 16px -3px rgba(20, 21, 26, 0.08)";
    titlePanel.style.position = "fixed";
    titlePanel.style.left = "12px";
    titlePanel.style.top = "12px";
    titlePanel.style.borderRadius = "12px";
    titlePanel.style.backgroundColor = "#ffff";
    titlePanel.style.display = "flex";
    titlePanel.style.alignItems = "center";
    titlePanel.style.gap = "8px";
    titlePanel.style.padding = "0 12px";
    titlePanel.style.height = "48px";
    const editButton = document.createElement("button");
    const editIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
    );
    editIcon.setAttribute("width", "13");
    editIcon.setAttribute("height", "13");
    editIcon.setAttribute("viewBox", "0 0 13 13");
    editIcon.setAttribute("fill", "none");
    editIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const editIconPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
    );
    editIconPath.setAttribute(
        "d",
        "M7.838 0.999902V2.33324H1.33333V11.6666H10.6667V5.1619H12V12.3332C12 12.51 11.9298 12.6796 11.8047 12.8046C11.6797 12.9297 11.5101 12.9999 11.3333 12.9999H0.666667C0.489856 12.9999 0.320286 12.9297 0.195262 12.8046C0.0702379 12.6796 0 12.51 0 12.3332V1.66657C0 1.48976 0.0702379 1.32019 0.195262 1.19516C0.320286 1.07014 0.489856 0.999902 0.666667 0.999902H7.838ZM11.1847 0.872018C11.4453 0.611315 11.868 0.611355 12.1285 0.872108C12.3889 1.1327 12.3889 1.55503 12.1284 1.81553L6.472 7.4719L5.53067 7.4739L5.52933 6.52924L11.1847 0.872018Z",
    );
    editIconPath.setAttribute("fill", "#ffff");
    editIcon.appendChild(editIconPath);
    editButton.appendChild(editIcon);
    const editFileText = document.createElement("p");
    const isSnapshotInIframe =
        window.parent &&
        window.parent !== window &&
        window.parent.location.href.includes("/snapshots/");
    editFileText.textContent = isSnapshotInIframe ? "Edit copy" : "Edit file";
    editButton.appendChild(editFileText);

    editButton.style.backgroundColor = "rgba(20, 21, 26, 1)";
    editButton.style.cursor = "pointer";
    editButton.style.boxShadow = "0px 1px 2px 0px rgba(20, 21, 26, 0.05)";
    editButton.style.color = "#ffff";
    editButton.style.fontSize = "14px";
    editButton.style.lineHeight = "20px";
    editButton.style.display = "flex";
    editButton.style.alignItems = "center";
    editButton.style.gap = "8px";
    editButton.style.padding = "8px";
    editButton.style.borderRadius = "10px";
    const separator = document.createElement("div");
    separator.style.borderRight = "1px solid rgba(222, 224, 227, 1)";
    separator.style.height = "100%";
    const boardName = document.createElement("div");
    const fileIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
    );
    fileIcon.setAttribute("width", "16");
    fileIcon.setAttribute("height", "18");
    fileIcon.setAttribute("viewBox", "0 0 16 18");
    fileIcon.setAttribute("fill", "none");
    fileIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
        "d",
        "M10.5 2.33341H2.16667V15.6667H13.8333V5.66675H10.5V2.33341ZM0.5 1.49341C0.5 1.03675 0.8725 0.666748 1.3325 0.666748H11.3333L15.5 4.83342V16.4942C15.5008 16.6037 15.48 16.7122 15.4388 16.8136C15.3976 16.915 15.3369 17.0073 15.2601 17.0852C15.1832 17.1631 15.0918 17.2252 14.991 17.2678C14.8902 17.3103 14.7819 17.3327 14.6725 17.3334H1.3275C1.10865 17.3319 0.899181 17.2443 0.744348 17.0897C0.589515 16.935 0.501746 16.7256 0.5 16.5067V1.49341ZM7.16667 8.16675V5.66675H8.83333V8.16675H11.3333V9.83342H8.83333V12.3334H7.16667V9.83342H4.66667V8.16675H7.16667Z",
    );
    path.setAttribute("fill", "#696B76");
    fileIcon.appendChild(path);
    boardName.appendChild(fileIcon);
    const boardNameTag = document.querySelector('meta[name="board-name"]');
    let boardNameStr = "Untitled";
    if (boardNameTag) {
        boardNameStr = boardNameTag.getAttribute("content");
    }
    const p = document.createElement("p");
    p.textContent = boardNameStr;
    p.style.fontSize = "16px";
    p.style.lineHeight = "24px";
    boardName.appendChild(p);
    const cloudIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
    );
    cloudIcon.setAttribute("width", "20");
    cloudIcon.setAttribute("height", "18");
    cloudIcon.setAttribute("viewBox", "0 0 20 18");
    cloudIcon.setAttribute("fill", "none");
    cloudIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const cloudIconPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
    );
    cloudIconPath.setAttribute(
        "d",
        "M2.92711 0.75009L18.8371 16.6601L17.6579 17.8393L15.9796 16.1601C15.401 16.3854 14.7855 16.5007 14.1646 16.5001H5.83128C4.65063 16.5008 3.50782 16.0838 2.60518 15.3227C1.70255 14.5617 1.09833 13.5058 0.89953 12.342C0.700726 11.1782 0.920157 9.98165 1.51897 8.96413C2.11778 7.94662 3.05734 7.17382 4.17128 6.78259C4.13561 6.05854 4.23538 5.3342 4.46544 4.64676L1.74794 1.92842L2.92711 0.75009ZM5.83128 6.50009C5.83128 6.56759 5.83294 6.63592 5.83628 6.70259L5.89461 7.94259L4.72461 8.35426C3.98336 8.6164 3.35857 9.132 2.96052 9.81003C2.56248 10.4881 2.41678 11.2849 2.54916 12.0599C2.68153 12.8349 3.08347 13.5383 3.684 14.0457C4.28453 14.5532 5.04504 14.8322 5.83128 14.8334H14.1646C14.3196 14.8334 14.4721 14.8226 14.6213 14.8026L5.85628 6.03759C5.83961 6.18926 5.83128 6.34342 5.83128 6.50009ZM9.99794 0.666756C10.7878 0.666732 11.5694 0.827112 12.2954 1.13817C13.0214 1.44923 13.6767 1.90449 14.2215 2.47635C14.7664 3.04821 15.1894 3.72476 15.4649 4.46498C15.7405 5.2052 15.8629 5.99367 15.8246 6.78259C16.5167 7.02639 17.1467 7.41945 17.6699 7.93391C18.1931 8.44837 18.5967 9.07163 18.8521 9.75951C19.1076 10.4474 19.2085 11.183 19.1479 11.9143C19.0873 12.6455 18.8665 13.3545 18.5013 13.9909L17.2571 12.7468C17.5023 12.1401 17.5636 11.4747 17.4331 10.8335C17.3027 10.1924 16.9864 9.60375 16.5237 9.14112C16.061 8.67849 15.4723 8.36232 14.8311 8.23202C14.1899 8.10173 13.5245 8.16308 12.9179 8.40842L11.6729 7.16259C12.4071 6.74176 13.2571 6.50009 14.1646 6.50009C14.1646 5.73714 13.9551 4.98884 13.559 4.33679C13.1629 3.68473 12.5953 3.15396 11.9182 2.80235C11.2411 2.45073 10.4805 2.29177 9.71923 2.34281C8.95799 2.39384 8.22538 2.65291 7.60127 3.09176L6.40961 1.90009C7.43392 1.09887 8.69749 0.664571 9.99794 0.666756Z",
    );
    cloudIconPath.setAttribute("fill", "#696B76");
    cloudIcon.appendChild(cloudIconPath);
    boardName.appendChild(cloudIcon);
    boardName.style.display = "flex";
    boardName.style.alignItems = "center";
    boardName.style.gap = "8px";
    titlePanel.appendChild(boardName);
    titlePanel.appendChild(separator);
    titlePanel.appendChild(editButton);
    document.body.appendChild(titlePanel);

    editButton.onclick = async () => {
        editButton.disabled = true;
        editButton.textContent = "Loading...";

        try {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("wheel", handleWheel, {
                passive: false,
            });
            translateX = 0;
            translateY = 0;
            scale = 1;
            updateTransform();

            const { initBrowserSettings } = await import(
                "https://www.unpkg.com/test_package_board@0.0.99/dist/bundle.js"
                );
            initBrowserSettings();

            const { createApp } = await import(
                "https://www.unpkg.com/test_package_board@0.0.99/dist/bundle.js"
                );

            const app = createApp();
            window.app = app;
            const stringed = await app.openAndEditFile();

            if (stringed) {
                await app.openBoardFromFile();
                app.getBoard().deserializeHTML(stringed);
                app.localRender("items");
            }

            const response = await fetch(
                "https://www.unpkg.com/test_package_board@0.0.99/dist/bundle.css",
            );
            const cssText = await response.text();
            const styleEl = document.createElement("style");
            styleEl.textContent = cssText;
            document.body.appendChild(styleEl);

            const responseSvg = await fetch(
                "https://www.unpkg.com/test_package_board@0.0.99/dist/sprite.svg",
            );
            const svgText = await responseSvg.text();
            const div = document.createElement("div");
            div.style.display = "none";
            div.id = "sprite";
            div.innerHTML = svgText;
            document.body.appendChild(div);
        } finally {
            editButton.disabled = false;
            editButton.textContent = "Edit board";
        }
    };
});
