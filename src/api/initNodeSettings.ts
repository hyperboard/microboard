import { SETTINGS } from "Board/Settings";
import { NodeDocumentFactory } from "./NodeDocumentFactory";
import { NodePath2D } from "./NodePath2DFactory";
import { initPaths } from "./initPaths";

export function initNodeSettings(): void {
	const documentFactory = new NodeDocumentFactory();
	const path2DFactory = new NodePath2D();
	SETTINGS.documentFactory = documentFactory;
	SETTINGS.path2DFactory = path2DFactory;

	initPaths(NodePath2D);
}
