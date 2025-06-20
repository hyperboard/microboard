export const isIframe = (): boolean => {
	return window.self !== window.top;
};