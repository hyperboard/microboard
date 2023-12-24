import {Mbr, Line, Point, Transformation, Path, Paths, Matrix} from "..";
import { Subject } from "Subject";
import { RichText } from "../RichText";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { Events, Operation } from "Board/Events";
import { GeometricNormal } from "../GeometricNormal";
import {ResizeType} from "../../Selection/Transformer/getResizeType";
import {getProportionalResize} from "../../Selection/Transformer/getResizeMatrix";
import {StickerCommand} from "./StickerCommand";
import {StickerData, StickerOperation} from "./StickerOperation";
import {StickerShape} from "./shape";

const defaultStickerData = new StickerData();
const _L = Math.sqrt(StickerShape.DEFAULTS[1]*StickerShape.DEFAULTS[1] + StickerShape.DEFAULTS[0]*StickerShape.DEFAULTS[0]);
const _R = StickerShape.DEFAULTS[0] / StickerShape.DEFAULTS[1];

export class Sticker implements Geometry {
    parent = "Board";
    public itemType = "Sticker";
    readonly transformation = new Transformation(this.id, this.events);
    private path = StickerShape.path.copy();
    private textContainer = StickerShape.textBounds.copy();
    readonly text = new RichText(
        this.textContainer,
        this.id,
        this.events,
        this.transformation,
        "\u00A0",
        false,
        true
    );
    readonly subject = new Subject<Sticker>();

    constructor(
        private events?: Events,
        private id = "",
        private backgroundColor = defaultStickerData.backgroundColor
    ) {
        this.transformation.subject.subscribe(() => {
            this.transformPath();
            this.subject.publish(this);
        });
        this.text.subject.subscribe(() => {
            this.subject.publish(this);
        });
    }

    emit(operation: StickerOperation): void {
        if (this.events) {
            const command = new StickerCommand([this], operation);
            command.apply();
            this.events.emit(operation, command);
        } else {
            this.apply(operation);
        }
    }

    serialize(): StickerData {
        return {
            itemType: "Sticker",
            backgroundColor: this.backgroundColor,
            transformation: this.transformation.serialize(),
            text: this.text.serialize(),
        };
    }

    deserialize(data: Partial<StickerData>): this {
        this.path = StickerShape.path.copy();
        this.textContainer = StickerShape.textBounds.copy();
        this.text.setContainer(this.textContainer.copy());
        this.text.updateElement();

        this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
        if (data.transformation) {
            this.transformation.deserialize(data.transformation);
            this.transformPath();
        }
        if (data.text) {
            this.text.deserialize(data.text);
        }
        this.subject.publish(this);
        return this;
    }

    setId(id: string): this {
        this.id = id;
        this.text.setId(id);
        this.transformation.setId(id);
        return this;
    }

    getId(): string {
        return this.id;
    }

    apply(op: Operation): void {
        switch (op.class) {
            case "Sticker":
                switch (op.method) {
                    case "setBackgroundColor":
                        this.applyBackgroundColor(op.backgroundColor);
                        break;
                }
                break;
            case "RichText":
                this.text.apply(op);
                break;
            case "Transformation":
                this.transformation.apply(op);
                this.text.setContainer(this.text.container);
                if (
                    op.method !== "translateTo" &&
                    op.method !== "translateBy"
                ) {
                    this.text.updateElement();
                }
                break;
            default:
                return;
        }
        this.subject.publish(this);
    }

    getBackgroundColor(): string {
        return this.backgroundColor;
    }

    private applyBackgroundColor(backgroundColor: string): void {
        this.backgroundColor = backgroundColor;
        this.path.setBackgroundColor(backgroundColor);
    }

    setBackgroundColor(backgroundColor: string): void {
        this.emit({
            class: "Sticker",
            method: "setBackgroundColor",
            item: [this.getId()],
            backgroundColor,
        });
    }

    getIntersectionPoints(segment: Line): Point[] {
        throw new Error("Not implemented")
    }

    getMbr(): Mbr {
        const rect = this.path.getMbr();
        const textRect = this.textContainer.getMbr();
        rect.combine([textRect]);
        return rect;
    }

    getNearestEdgePointTo(point: Point): Point {
        return this.path.getNearestEdgePointTo(point);
    }

    getDistanceToPoint(point: Point): number {
        const nearest = this.getNearestEdgePointTo(point);
        return point.getDistance(nearest);
    }

    isUnderPoint(point: Point): boolean {
        return (
            this.textContainer.isUnderPoint(point) ||
            this.path.isUnderPoint(point)
        );
    }

    isNearPoint(point: Point, distance: number): boolean {
        return distance > this.getDistanceToPoint(point);
    }

    isEnclosedOrCrossedBy(rect: Mbr): boolean {
        return (
            this.textContainer.isEnclosedOrCrossedBy(rect) ||
            this.path.isEnclosedOrCrossedBy(rect)
        );
    }

    isEnclosedBy(rect: Mbr): boolean {
        return this.text.isEnclosedBy(rect) || this.path.isEnclosedBy(rect);
    }

    isInView(rect: Mbr): boolean {
        return this.isEnclosedOrCrossedBy(rect);
    }

    getNormal(point: Point): GeometricNormal {
        return this.path.getNormal(point);
    }

    render(context: DrawingContext): void {
        this.path.render(context);
        this.text.render(context);
    }

    getPaths(): Path | Paths {
        return this.path;
    }

    isClosed(): boolean {
        return this.path instanceof Path && this.path.isClosed();
    }

    private transformPath(): void {
        this.path = StickerShape.path.copy();
        this.textContainer = StickerShape.textBounds.copy();
        this.text.setContainer(this.textContainer.copy());
        this.text.updateElement();
        this.textContainer.transform(this.transformation.matrix);
        this.path.transform(this.transformation.matrix);
        this.path.setBackgroundColor(this.backgroundColor);
    }

    getPath(): Path | Paths {
        return this.path.copy();
    }

    getSnapAnchorPoints(): Point[] {
        const anchorPoints = StickerShape.anchorPoints;
        const points = [];
        for (const anchorPoint of anchorPoints) {
            points.push(anchorPoint.getTransformed(this.transformation.matrix));
        }
        return points;
    }

    setDiagonal(line: Line) {
        const l = line.getLength() / _L;
        let x = line.start.x;
        let y = line.start.y;
        if(line.end.x < line.start.x) x -= (l * StickerShape.DEFAULTS[0])
        if(line.end.y < line.start.y) y -= (l * StickerShape.DEFAULTS[1])
        this.transformation.translateTo(x, y);
        this.transformation.scaleTo(l, l)
    }
    transformToCenter(pt: Point, width?: number) {
        if(width) {
            const scale = width / StickerShape.DEFAULTS[0];

            const w = StickerShape.DEFAULTS[0] * scale;
            const h = StickerShape.DEFAULTS[1] * scale;

            this.transformation.translateTo(pt.x - w / 2, pt.y - h / 2);
            this.transformation.scaleTo(scale, scale)
        } else {
            this.transformation.translateTo(pt.x - StickerShape.DEFAULTS[0] / 2, pt.y - StickerShape.DEFAULTS[1] / 2);
            this.transformation.scaleTo(1,1)
        }
    }
    doResize(resizeType: ResizeType,
             pointer: Point,
             mbr: Mbr,
             opposite: Point,
             startMbr: Mbr): { matrix: Matrix; mbr: Mbr } {
        const res = getProportionalResize(
            resizeType,
            pointer,
            mbr,
            opposite
        );

        if (['left', 'right'].indexOf(resizeType) > -1) {
            const d = startMbr.getWidth() / startMbr.getHeight();
            const originallySquared = (d > 0.99 * _R && d < 1.01 * _R);
            const d3 = this.getMbr().getWidth() / this.getMbr().getHeight();
            const nowSquared = (d3 > 0.99 * _R && d3 < 1.01 * _R);
            let growSquared = res.mbr.getWidth() < (startMbr.getWidth())
            let shrinkSquared = (res.mbr.getWidth() / startMbr.getMbr().getWidth()) < 0.8;

            let needGrow = (originallySquared && !growSquared && nowSquared) || (!originallySquared && !shrinkSquared && nowSquared)
            let needShrink = (originallySquared && growSquared && !nowSquared) || (!originallySquared && shrinkSquared && !nowSquared)

            let startWidth = this.getMbr().getWidth()
            if (needGrow) {
                this.transformation.scaleBy(1.33, 1);
                if (resizeType == 'left') {
                    this.transformation.translateBy(startWidth-this.getMbr().getWidth(), 0)
                }
            } else if (needShrink) {
                this.transformation.scaleBy(1/1.33, 1);
                if (resizeType == 'left') {
                    this.transformation.translateBy(startWidth-this.getMbr().getWidth(), 0)
                }
            }
        } else {
            this.transformation.scaleBy(res.matrix.scaleX, res.matrix.scaleY);
            this.transformation.translateBy(res.matrix.translateX, res.matrix.translateY);
        }
        res.mbr = this.getMbr();

        return res;
    }
}
