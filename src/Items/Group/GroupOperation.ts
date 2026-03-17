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

interface AddChildren {
	class: "Group";
	method: "addChildren";
	item: string[];
	newData: { childIds: string[] };
}

interface RemoveChildren {
	class: "Group";
	method: "removeChildren";
	item: string[];
	newData: { childIds: string[] };
}

export type GroupOperation = AddChild | RemoveChild | AddChildren | RemoveChildren;
