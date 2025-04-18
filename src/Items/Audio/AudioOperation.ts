interface AudioBaseOp {
	class: "Audio";
	item: string[];
}

interface SetUrl extends AudioBaseOp {
	method: "setUrl";
	url: string;
}

export type AudioOperation = SetUrl;
