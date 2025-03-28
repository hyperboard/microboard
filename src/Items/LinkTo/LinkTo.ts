import { SubjectOperation } from "shared/SubjectOperation";
import { LinkToOperation } from "./LinkToOperation";
import { Events } from "../../Events";
import { LinkToCommand } from "./LinkToCommand";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { DrawingContext } from "Board/Items/DrawingContext";
import { conf } from "Board/Settings";

export class LinkTo {
	readonly subject = new SubjectOperation<LinkTo, LinkToOperation>();
	link?: string;
	transformationRenderBlock?: boolean = undefined;

	constructor(
		private id = "",
		private events?: Events,
	) {}

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
			default:
				return;
		}
		this.subject.publish(this, op);
	}

	private applySetLink(link?: string): void {
		this.link = link;
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
			method: "setLinkTo",
			item: [this.id],
			link: undefined,
		});
	}

	render(
		context: DrawingContext,
		top: number,
		right: number,
		scale: number,
	): void {
		const ctx = context.ctx;
		ctx.save();
		ctx.globalCompositeOperation = "destination-out";
		const size = conf.LINK_BTN_SIZE / scale;
		const offset = conf.LINK_BTN_OFFSET / scale;
		ctx.fillRect(right - size - offset, top + offset, size, size);
		ctx.restore();
	}

	// smell have to redo without document
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("link-item");
		div.classList.add("link-object");
		div.id = this.id;
		div.style.width = `24px`;
		div.style.height = `24px`;
		div.style.transformOrigin = "top left";
		div.style.position = "absolute";
		div.style.backgroundColor = "#FFFFFF";
		div.style.borderRadius = "2px";
		div.style.zIndex = "1";
		const link = documentFactory.createElement("a");
		link.style.position = "absolute";
		link.style.width = `100%`;
		link.style.height = `100%`;
		link.style.borderRadius = "2px";
		link.style.display = "flex";
		link.style.justifyContent = "center";
		link.style.alignItems = "center";
		link.setAttribute("target", "_blank");
		if (this.link) {
			link.href = this.link;
			const image = documentFactory.createElement("img");
			image.id = this.id;
			image.classList.add("link-image");
			image.src = `${new URL(this.link).origin}/favicon.ico`;
			image.width = 20;
			image.height = 20;
			image.style.display = "block";
			link.appendChild(image);
		}

		div.appendChild(link);
		return div;
	}
}
