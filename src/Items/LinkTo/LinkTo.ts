import { SubjectOperation } from "../../../SubjectOperation";
import { LinkToOperation } from "./LinkToOperation";
import { Events } from "../../Events";
import { LinkToCommand } from "./LinkToCommand";

export class LinkTo {
	readonly subject = new SubjectOperation<LinkTo, LinkToOperation>();
	link?: string;

	constructor(private id = "", private events?: Events) {}

	serialize(): string | undefined {
		return this.link;
	}

	deserialize(link?: string): this {
		this.link = link;
		return this;
	}

	private emit(operation: LinkToOperation): void {
		if (this.events) {
			const command = new LinkToCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setId(id: string): void {
		this.id = id;
	}

	apply(op: LinkToOperation): void {
		switch (op.method) {
			case "setLinkTo":
				this.applySetLink(op.link);
				break;
			case "removeLinkTo":
				this.applyRemoveLink();
				break;
			default:
				return;
		}
		this.subject.publish(this, op);
	}

	private applySetLink(link: string): void {
		this.link = link;
	}

	private applyRemoveLink(): void {
		this.link = undefined;
	}

	setLinkTo(link: string): void {
		this.emit({
			class: "LinkTo",
			method: "setLinkTo",
			item: [this.id],
			link,
		});
	}

	removeLinkTo(): void {
		this.emit({
			class: "LinkTo",
			method: "removeLinkTo",
			item: [this.id],
		});
	}
}
