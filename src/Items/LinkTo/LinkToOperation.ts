interface LinkToBase {
	class: "LinkTo";
	item: string[];
}

interface SetLinkTo extends LinkToBase {
	method: "setLinkTo";
	link: string;
}

interface RemoveLinkTo extends LinkToBase {
	method: "removeLinkTo";
}

export type LinkToOperation = SetLinkTo | RemoveLinkTo;
