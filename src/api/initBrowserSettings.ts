import { Settings, conf } from "Board/Settings";
import { BrowserDocumentFactory } from "./BrowserDocumentFactory";
import { BrowserPath2D } from "./BrowserPath2DFactory";
import { initPaths } from "./initPaths";
import { getMeasureCtx } from "./getMeasureCtx";
import { initI18N } from "./initI18N";

const documentFactory = new BrowserDocumentFactory();
conf.documentFactory = documentFactory;
conf.path2DFactory = BrowserPath2D;
conf.measureCtx = getMeasureCtx();
conf.getDocumentWidth = () => document.documentElement.clientWidth;
conf.getDocumentHeight = () => document.documentElement.clientHeight;
conf.getDPI = () => window.devicePixelRatio;
initI18N();
initPaths(BrowserPath2D);

// export dummy to prevent tree shake
export function initBrowserSettings(): Settings {
	return conf;
}
