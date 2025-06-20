import { conf, Settings } from 'Settings';
import { BrowserDocumentFactory } from './BrowserDocumentFactory';
import { BrowserPath2D } from './BrowserPath2DFactory';
import { getMeasureCtx } from './getMeasureCtx';
import { getBrowserDOMParser } from './BrowserDOMParser';
import { initPaths } from './initPaths';
import { ReactEditor } from 'slate-react';

export function initBrowserSettings(): Settings {
	conf.documentFactory = new BrowserDocumentFactory();
	conf.path2DFactory = BrowserPath2D;
	conf.measureCtx = getMeasureCtx();
	conf.getDocumentWidth = () => document.documentElement.clientWidth;
	conf.getDocumentHeight = () => document.documentElement.clientHeight;
	conf.getDPI = () => window.devicePixelRatio;
	conf.getDOMParser = getBrowserDOMParser;
	initPaths(BrowserPath2D);
	conf.reactEditorFocus = editor => {
		try {
			ReactEditor.focus(editor);
		} catch (e) {
			console.warn('Failed to focus editor:', e);
		}
	};

	conf.reactEditorToSlatePoint = (editor, domNode, offset, options) => {
		try {
			return ReactEditor.toSlatePoint(editor, [domNode, offset], options);
		} catch (e) {
			console.warn('Failed to convert DOM point to Slate point:', e);
			return null;
		}
	};

	return conf;
}
