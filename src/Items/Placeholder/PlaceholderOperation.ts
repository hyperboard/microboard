export type PlaceholderOperation = SetBackgroundColor | SetIcon | SetMiroData;

interface BasePlaceholderOperation {
	class: "Placeholder";
	item: string[];
}

interface SetBackgroundColor extends BasePlaceholderOperation {
	method: "setBackgroundColor";
	backgroundColor: string;
}

interface SetIcon extends BasePlaceholderOperation {
	method: "setIcon";
	icon: string;
}

interface SetMiroData extends BasePlaceholderOperation {
	method: "setMiroData";
	miroData: unknown;
}
