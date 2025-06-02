import { conf } from 'Settings';

export function getMeasureCtx() {
	if (typeof document !== 'undefined') {
		const measureCanvas = conf.documentFactory.createElement('canvas');
		const measureCtx = measureCanvas.getContext('2d');
		if (!measureCtx) {
			throw new Error('Failde to create canvas and get 2d context');
		}
		return measureCtx;
	} else {
		const { Canvas } = require('canvas');
		const canvas = new Canvas(1, 1);
		const context = canvas.getContext('2d');
		return context;
	}
}
