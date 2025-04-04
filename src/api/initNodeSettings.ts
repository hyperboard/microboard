import { Settings, conf } from "Board/Settings";
import { NodeDocumentFactory } from "./NodeDocumentFactory";
import { NodePath2D } from "./NodePath2DFactory";
import { initPaths } from "./initPaths";
import { getMeasureCtx } from "./getMeasureCtx";
import { initI18N } from "./initI18N";
// import { Canvas } from "canvas";
import "css.escape";

// export dummy to prevent tree shake
export function initNodeSettings(): Settings {
	return conf;
}

const documentFactory = new NodeDocumentFactory();
conf.documentFactory = documentFactory;
conf.path2DFactory = NodePath2D;
// const canvas = new Canvas(1, 1);
// const context = canvas.getContext("2d");
// conf.measureCtx = context;
conf.measureCtx = getMeasureCtx();
initI18N();
initPaths(NodePath2D);
initPaths(NodePath2D);
