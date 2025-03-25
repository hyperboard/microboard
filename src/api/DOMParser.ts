export function getDOMParser() {
	if (typeof DOMParser !== "undefined") {
		// Browser: use native DOMParser
		return new DOMParser();
	} else {
		// Node: use jsdom
		const { JSDOM } = require("jsdom");
		return {
			parseFromString: (str, mimeType) => {
				if (mimeType === "text/html") {
					const dom = new JSDOM(str, { contentType: "text/html" });
					return dom.window.document;
				} else if (
					mimeType === "image/svg+xml" ||
					mimeType === "application/xml"
				) {
					const dom = new JSDOM(str, { contentType: "text/xml" });
					return dom.window.document;
				} else {
					throw new Error(`Unsupported MIME type: ${mimeType}`);
				}
			},
		};
	}
}
