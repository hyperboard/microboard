import { SubjectOperation } from "SubjectOperation";
import { LinkToOperation } from "./LinkToOperation";
import { Events } from "../../Events";
import { LinkToCommand } from "./LinkToCommand";
import { DocumentFactory } from "api/DocumentFactory";
import { DrawingContext } from "Items/DrawingContext";
import { conf } from "Settings";

export class LinkTo {
  public readonly subject: SubjectOperation<LinkTo, LinkToOperation> =
    new SubjectOperation<LinkTo, LinkToOperation>();
  link?: string;
  transformationRenderBlock?: boolean = undefined;

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
    scale: number
  ): void {
    const ctx = context.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const size = conf.LINK_BTN_SIZE / scale;
    const offset = conf.LINK_BTN_OFFSET / scale;
    ctx.fillRect(right - size - offset, top + offset, size, size);
    ctx.restore();
  }

}
