export const VerticalAlignments = ["top", "center", "bottom"] as const;
export type VerticalAlignment = typeof VerticalAlignments[number];

export const HorisontalAlignments = ["left", "center", "right"] as const;
export type HorisontalAlignment = typeof HorisontalAlignments[number];
