import { Board } from 'Board';
import { Line, Frame, Mbr, Item } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';
import { FrameType } from 'Items/Frame/Basic';
import { BoardTool } from 'Tools/BoardTool';
import { NestingHighlighter } from 'Tools/NestingHighlighter';

export class AddFrame extends BoardTool {
	line: Line | undefined;
	shape: FrameType = 'Custom';
	frame: Frame;
	mbr = new Mbr();
	isDown = false;
	nestingHighlighter = new NestingHighlighter();

	constructor(board: Board) {
		super(board);
		this.frame = new Frame(
			board,
			board.items.getById.bind(board.items),
			'',
			`Frame ${this.board.getMaxFrameSerial() + 1}`
		);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor('crosshair');
	}

	setShapeType(type: FrameType): void {
		this.shape = type;
	}

	keyDown(key: string): boolean {
		if (key === 'Escape') {
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
			this.line = new Line(this.line.start.copy(), this.board.pointer.point.copy());
			this.mbr = this.line.getMbr();
			this.mbr.borderColor = 'blue';

			this.nestingHighlighter.clear();
			const enclosedOrCrossed = this.board.items.getEnclosedOrCrossed(
				this.mbr.left,
				this.mbr.top,
				this.mbr.right,
				this.mbr.bottom
			);
			const inside = enclosedOrCrossed.filter(
				item =>
					!(item instanceof Frame) &&
					item.parent === 'Board' &&
					this.mbr.isInside(item.getMbr().getCenter())
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
			const { x, y } = this.frame.getLastFrameScale();
			this.applyScaleTo(x, y);
			this.transformToPointerCenter();
		} else {
			this.initTransformation(width / 100, height / 100);
			localStorage.setItem('lastFrameScale', JSON.stringify(this.frame.transformation.getScale()));
		}

		const currMbr = this.frame.getMbr();
		const frameChildren = this.board.items
			.getEnclosedOrCrossed(currMbr.left, currMbr.top, currMbr.right, currMbr.bottom)
			.filter(item => item.parent === 'Board')
			.filter(item => this.frame.handleNesting(item));
		this.applyAddChildren(frameChildren);
		if (this.shape !== 'Custom') {
			this.applyCanChangeRatio(false);
		}
		const frame = this.board.add(this.frame);

		// frame.setNameSerial(this.board.items.listFrames());
		frame.text.editor.moveCursorToEndOfTheText();

		this.nestingHighlighter.clear();
		this.board.selection.removeAll();
		this.board.selection.add(frame);
		this.board.selection.editText();
		this.board.tools.select();
		this.board.tools.publish();
		return true;
	}

	addNextTo(): void {
		const framesInView = this.board.items.getItemsInView().filter(item => item instanceof Frame);
		if (framesInView.length === 0) {
			if (this.shape === 'Custom') {
				const { x, y } = this.frame.getLastFrameScale();
				this.applyScaleTo(x, y);
			} else {
				this.applyFrameType(this.shape);
				this.applyScaleBy(4, 4);
				this.applyCanChangeRatio(false);
			}
			this.transformToCenter();
		} else {
			const frames = this.board.items.listAll().filter(frame => frame instanceof Frame && frame !== this.frame) as Frame[];
			let nextTo = framesInView.reduce((rightest, frame) => {
				if (frame.getMbr().right > rightest.getMbr().right) {
					rightest = frame;
				}
				return rightest;
			}, framesInView[0]);
			this.applyTranslateTo(
				nextTo.transformation.getTranslation().x + nextTo.getMbr().getWidth() + 20,
				nextTo.transformation.getTranslation().y
			);
			const findNext = (): undefined | Frame =>
				frames.find(
					frame =>
						frame.getMbr().left === this.frame.getMbr().left &&
						frame.getMbr().top === this.frame.getMbr().top
				);
			let foundNext = findNext();
			while (foundNext) {
				nextTo = foundNext;
				this.applyTranslateTo(
					nextTo.transformation.getTranslation().x + nextTo.getMbr().getWidth() + 20,
					nextTo.transformation.getTranslation().y
				);
				foundNext = findNext();
			}
			this.applyFrameType(this.shape);
			if (this.shape === 'Custom') {
				this.applyFrameType(nextTo.getFrameType());
				this.applyScaleBy(nextTo.transformation.getScale().x, nextTo.transformation.getScale().y);
			} else {
				const min = Math.min(
					nextTo.transformation.getScale().x,
					nextTo.transformation.getScale().y
				);
				this.applyScaleBy(min, min);
			}
			this.board.camera.viewRectangle(this.frame.getMbr());
		}
		const frameMbr = this.frame.getMbr();
		this.board.items
			.getEnclosedOrCrossed(frameMbr.left, frameMbr.top, frameMbr.right, frameMbr.bottom)
			.filter(item => item.parent === 'Board')
			.filter(item => this.frame.handleNesting(item))
			.forEach(item => this.applyAddChildren([item]));
		const frame = this.board.add(this.frame);
		// frame.setNameSerial(this.board.items.listFrames());
		frame.text.editor.moveCursorToEndOfTheText();

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
		this.applyTranslateTo(this.mbr.left, this.mbr.top);
		this.applyScaleTo(sx, sy);
	}

	transformToCenter(): void {
		this.applyTranslateTo(
			this.board.camera.getMbr().getCenter().x,
			this.board.camera.getMbr().getCenter().y
		);
		this.applyTranslateBy(
			-this.frame.getMbr().getWidth() / 2,
			-this.frame.getMbr().getHeight() / 2
		);
	}

	transformToPointerCenter(): void {
		this.applyTranslateTo(this.board.pointer.point.copy().x, this.board.pointer.point.copy().y);
		this.applyTranslateBy(
			-this.frame.getMbr().getWidth() / 2,
			-this.frame.getMbr().getHeight() / 2
		);
	}

	applyScaleTo(x: number, y: number): void {
		this.frame.transformation.apply({
			class: 'Transformation',
			method: 'scaleTo',
			item: [this.frame.getId()],
			x,
			y,
		});
	}

	applyScaleBy(x: number, y: number): void {
		this.frame.transformation.apply({
			class: 'Transformation',
			method: 'scaleBy',
			item: [this.frame.getId()],
			x,
			y,
		});
	}

	applyTranslateTo(x: number, y: number): void {
		this.frame.transformation.apply({
			class: 'Transformation',
			method: 'translateTo',
			item: [this.frame.getId()],
			x,
			y,
		});
	}

	applyTranslateBy(x: number, y: number): void {
		this.frame.transformation.apply({
			class: 'Transformation',
			method: 'translateBy',
			item: [this.frame.getId()],
			x,
			y,
		});
	}

	applyAddChildren(children: Item[]): void {
		const childrenIds = children.map(child => {
			child.parent = this.frame.getId();
			return child.getId();
		});
		this.frame.applyAddChild(childrenIds);
		this.frame.subject.publish(this.frame);
	}

	applyCanChangeRatio(canChangeRatio: boolean): void {
		this.frame.apply({
			class: 'Frame',
			method: 'setCanChangeRatio',
			item: [this.frame.getId()],
			canChangeRatio,
		});
	}

	applyFrameType(shapeType: FrameType): void {
		this.frame.apply({
			class: 'Frame',
			method: 'setFrameType',
			item: [this.frame.getId()],
			shapeType,
			prevShapeType: this.frame.getFrameType(),
		});
	}

	render(context: DrawingContext): void {
		if (this.isDown) {
			// this.frame.renderBorders(context);
			this.mbr.render(context);
			this.nestingHighlighter.render(context);
		}
	}
}
