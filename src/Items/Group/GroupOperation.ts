interface AddChild {
	class: "Group";
	method: "addChild";
	item: string[];
	childId: string;
}

interface RemoveChild {
	class: "Group";
	method: "removeChild";
	item: string[];
	childId: string;
}

export type GroupOperation = AddChild | RemoveChild;
