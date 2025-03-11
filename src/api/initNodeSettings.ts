import { Settings, SETTINGS } from "Board/Settings";
import { NodeDocumentFactory } from "./NodeDocumentFactory";
import { NodePath2D } from "./NodePath2DFactory";
import { initPaths } from "./initPaths";
import { getMeasureCtx } from "./getMeasureCtx";

// export dummy to prevent tree shake
export function initNodeSettings(): Settings {
	return SETTINGS;
}

const documentFactory = new NodeDocumentFactory();
SETTINGS.documentFactory = documentFactory;
SETTINGS.path2DFactory = NodePath2D;
SETTINGS.measureCtx = getMeasureCtx();

initPaths(NodePath2D);
