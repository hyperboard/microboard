import { getNodeDOMParser } from './NodeDOMParser';
import { NodeDocumentFactory } from './NodeDocumentFactory';
import { NodePath2D } from './NodePath2DFactory';
import { initPaths } from './initPaths';
import { getMeasureCtx } from './getMeasureCtx';
import 'css.escape';
import { Settings, conf } from 'Settings';

// export dummy to prevent tree shake
export function initNodeSettings(): Settings {
	const documentFactory = new NodeDocumentFactory();
	conf.documentFactory = documentFactory;
	conf.path2DFactory = NodePath2D;
	conf.measureCtx = getMeasureCtx();
	conf.getDOMParser = getNodeDOMParser;
	initPaths(NodePath2D);

	return conf;
}
