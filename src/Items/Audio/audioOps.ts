import { AudioItem } from "./Audio";
import { AudioOperation } from "./AudioOperation";

export const audioOps = {
	setUrl: (items: AudioItem[], url: string): AudioOperation => ({
		class: "Audio",
		method: "setUrl",
		item: items.map(i => i.getId()),
		url,
	}),
};
