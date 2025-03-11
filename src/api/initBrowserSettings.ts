import { Settings, SETTINGS } from "Board/Settings";
import { BrowserDocumentFactory } from "./BrowserDocumentFactory";
import { BrowserPath2D } from "./BrowserPath2DFactory";
import { initPaths } from "./initPaths";
import { getMeasureCtx } from "./getMeasureCtx";

// export dummy to prevent tree shake
export function initBrowserSettings(): Settings {
	return SETTINGS;
}

const documentFactory = new BrowserDocumentFactory();
SETTINGS.documentFactory = documentFactory;
SETTINGS.path2DFactory = BrowserPath2D;
SETTINGS.measureCtx = getMeasureCtx();
initPaths(BrowserPath2D);
