import { Custom } from "./Custom";
import { Frame16x9 } from "./16-9";
import { Frame4x3 } from "./4-3";
import { A4 } from "./A4";
import { Letter } from "./Letter";
import { Frame1x1 } from "./1-1";

export const Frames = {
	Custom,
	Frame16x9,
	Frame4x3,
	A4,
	Letter,
	Frame1x1,
} as const;

export type FrameType = keyof typeof Frames;
