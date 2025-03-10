import { Settings, SETTINGS } from "Board/Settings";
import { BrowserDocumentFactory } from "./BrowserDocumentFactory";
import { BrowserPath2D } from "./BrowserPath2DFactory";
import { initPaths } from "./initPaths";

export function initBrowserSettings(): Settings {
	const documentFactory = new BrowserDocumentFactory();
	const path2DFactory = new BrowserPath2D();
	SETTINGS.documentFactory = documentFactory;
	SETTINGS.path2DFactory = path2DFactory;

	initPaths(BrowserPath2D);
    return SETTINGS;
}
