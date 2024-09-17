import { Geometry } from "../Geometry";
import { Transformation } from "../Transformation";
import { Subject } from "../../../Subject";
import { StickerShape } from "../Sticker";

export class Template implements Geometry {
	parent = "Board";
	readonly itemType = "Template";
	readonly transformation = new Transformation(this.id, this.events);
	private stickerPath = StickerShape.stickerPath.copy();
	readonly subject = new Subject<Template>();
}
