import { AudioConstructorData } from "./Audio";

interface AudioBaseOp {
	class: "Audio";
	item: string[];
}

interface UpdateAudioData extends AudioBaseOp {
	method: "updateAudioData";
	data: AudioConstructorData;
}

export type AudioOperation = UpdateAudioData;
