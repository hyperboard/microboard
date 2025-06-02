export function getNodeDOMParser() {
	const { JSDOM } = require('jsdom');
	return {
		parseFromString: (str: string, type: DOMParserSupportedType) => {
			if (type === 'text/html') {
				const dom = new JSDOM(str, { contentType: 'text/html' });
				return dom.window.document;
			} else if (type === 'image/svg+xml' || type === 'application/xml') {
				const dom = new JSDOM(str, { contentType: 'text/xml' });
				return dom.window.document;
			} else {
				throw new Error(`Unsupported MIME type: ${type}`);
			}
		},
	};
}
