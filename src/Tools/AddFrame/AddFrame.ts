import { Board } from "Board";
import { Frame, Line, Mbr } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { FrameType } from "Board/Items/Frame/Basic";
import { BoardTool } from "../BoardTool";
import { NestingHighlighter } from "../NestingHighlighter";

export class AddFrame extends BoardTool {
	line: Line | undefined;
	shape: FrameType = "Custom";
	frame: Frame;
	mbr = new Mbr();
	isDown = false;
	nestingHighlighter = new NestingHighlighter();

	constructor(private board: Board) {
		super(board);
		this.frame = new Frame(
			undefined,
			"",
			`Frame ${this.board.getMaxFrameSerial() + 1}`,
		);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor("crosshair");
	}

	setShapeType(type: FrameType): void {
		this.shape = type;
	}

	keyDown(key: string): boolean {
		if (key === "Escape") {
			this.board.tools.select();
			return true;
		}
		return false;
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.mbr = this.line.getMbr();
		this.initTransformation();
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			this.line = new Line(
				this.line.start.copy(),
				this.board.pointer.point.copy(),
			);
			this.mbr = this.line.getMbr();
			this.mbr.borderColor = "blue";

			this.nestingHighlighter.clear();
			const enclosedOrCrossed = this.board.items.getEnclosedOrCrossed(
				this.mbr.left,
				this.mbr.top,
				this.mbr.right,
				this.mbr.bottom,
			);
			const inside = enclosedOrCrossed.filter(
				item =>
					!(item instanceof Frame) &&
					item.parent === "Board" &&
					this.mbr.isInside(item.getMbr().getCenter()),
			);
			this.nestingHighlighter.add(this.frame, inside);

			this.initTransformation();
			this.board.tools.publish();
			return true;
		}
		return false;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		const width = this.mbr.getWidth();
		const height = this.mbr.getHeight();
		if (width < 2 && height < 2) {
			this.frame.scaleLikeLastFrame();
			this.transformToPointerCenter();
			this.board.fitMbrInView(this.mbr);
		} else {
			this.initTransformation(width / 100, height / 100);
			localStorage.setItem(
				"lastFrameScale",
				JSON.stringify(this.frame.transformation.getScale()),
			);
		}

		const currMbr = this.frame.getMbr();
		this.board.items
			.getEnclosedOrCrossed(
				currMbr.left,
				currMbr.top,
				currMbr.right,
				currMbr.bottom,
			)
			.filter(item => item.parent === "Board")
			.filter(item => this.frame.handleNesting(item))
			.forEach(item => this.frame.emitAddChild(item));
		const frame = this.board.add(this.frame);
		if (this.shape !== "Custom") {
			frame.setCanChangeRatio(false);
		}

		// frame.setNameSerial(this.board.items.listFrames());
		frame.text.moveCursorToEOL();

		this.nestingHighlighter.clear();
		this.board.selection.removeAll();
		this.board.selection.add(frame);
		this.board.selection.editText();
		this.board.tools.select();
		this.board.tools.publish();
		return true;
	}

	addNextTo(): void {
		const framesInView = this.board.items.getFramesInView();
		if (framesInView.length === 0) {
			if (this.shape === "Custom") {
				this.frame.scaleLikeLastFrame();
			} else {
				this.frame.setFrameType(this.shape);
				this.frame.transformation.scaleBy(4, 4);
				this.frame.setCanChangeRatio(false);
			}
			this.transformToCenter();
		} else {
			const frames = this.board.items
				.listFrames()
				.filter(frame => frame !== this.frame);
			let nextTo = framesInView.reduce((rightest, frame) => {
				if (frame.getMbr().right > rightest.getMbr().right) {
					rightest = frame;
				}
				return rightest;
			}, framesInView[0]);
			this.frame.transformation.translateTo(
				nextTo.transformation.getTranslation().x +
					nextTo.getMbr().getWidth() +
					20,
				nextTo.transformation.getTranslation().y,
			);
			const findNext = (): undefined | Frame =>
				frames.find(
					frame =>
						frame.getMbr().left === this.frame.getMbr().left &&
						frame.getMbr().top === this.frame.getMbr().top,
				);
			let foundNext = findNext();
			while (foundNext) {
				nextTo = foundNext;
				this.frame.transformation.translateTo(
					nextTo.transformation.getTranslation().x +
						nextTo.getMbr().getWidth() +
						20,
					nextTo.transformation.getTranslation().y,
				);
				foundNext = findNext();
			}
			this.frame.setFrameType(this.shape);
			if (this.shape === "Custom") {
				this.frame.setFrameType(nextTo.getFrameType());
				this.frame.transformation.scaleBy(
					nextTo.transformation.getScale().x,
					nextTo.transformation.getScale().y,
				);
			} else {
				const min = Math.min(
					nextTo.transformation.getScale().x,
					nextTo.transformation.getScale().y,
				);
				this.frame.transformation.scaleBy(min, min);
			}
			this.board.fitMbrInView(this.frame.getMbr());
		}
		const frameMbr = this.frame.getMbr();
		this.board.items
			.getEnclosedOrCrossed(
				frameMbr.left,
				frameMbr.top,
				frameMbr.right,
				frameMbr.bottom,
			)
			.filter(item => item.parent === "Board")
			.filter(item => this.frame.handleNesting(item))
			.forEach(item => this.frame.emitAddChild(item));
		const frame = this.board.add(this.frame);
		// frame.setNameSerial(this.board.items.listFrames());
		frame.text.moveCursorToEOL();

		this.nestingHighlighter.clear();
		this.board.selection.removeAll();
		this.board.selection.add(frame);
		this.board.selection.editText();
		this.board.tools.select();
		this.board.tools.publish();
	}

	initTransformation(sx?: number, sy?: number): void {
		sx = sx || this.mbr.getWidth() / 100;
		sy = sy || this.mbr.getHeight() / 100;
		this.frame.transformation.translateTo(this.mbr.left, this.mbr.top);
		this.frame.transformation.scaleTo(sx, sy);
	}

	transformToCenter(): void {
		this.frame.transformation.translateTo(
			this.board.camera.getMbr().getCenter().x,
			this.board.camera.getMbr().getCenter().y,
		);
		this.frame.transformation.translateBy(
			-this.frame.getMbr().getWidth() / 2,
			-this.frame.getMbr().getHeight() / 2,
		);
	}

	transformToPointerCenter(): void {
		this.frame.transformation.translateTo(
			this.board.pointer.point.copy().x,
			this.board.pointer.point.copy().y,
		);
		this.frame.transformation.translateBy(
			-this.frame.getMbr().getWidth() / 2,
			-this.frame.getMbr().getHeight() / 2,
		);
	}

	render(context: DrawingContext): void {
		if (this.isDown) {
			// this.frame.renderBorders(context);
			this.mbr.render(context);
			this.nestingHighlighter.render(context);
		}
	}
}
