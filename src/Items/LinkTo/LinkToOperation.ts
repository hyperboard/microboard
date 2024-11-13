interface LinkToBase {
	class: "LinkTo";
	item: string[];
}

interface SetLinkTo extends LinkToBase {
	method: "setLinkTo";
	link: string | undefined;
}

export type LinkToOperation = SetLinkTo;
