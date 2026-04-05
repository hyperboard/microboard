import type { Events, Operation } from "Events";
import { DrawingContext } from "Geometry/DrawingContext";
import { Shapes, ShapeType } from "../Shape/index";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { Subject } from "Subject";
import { GeometricNormal } from "Geometry/GeometricNormal";
import { Line } from "Geometry/Line/Line";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Path } from "Geometry/Path/Path";
import { Paths } from "Geometry/Path/Paths";
import { Point } from "Geometry/Point/Point";
import { Transformation } from "Geometry/Transformation/Transformation";
import { Matrix } from "Geometry/Transformation/Matrix";
import type { TransformationData } from "Geometry/Transformation/TransformationData";
import { PlaceholderOperation } from "./PlaceholderOperation";
import { PlaceholderCommand } from "./PlaceholderCommand";
import { getResize } from "../../Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { BaseItem } from "../BaseItem/BaseItem";
import { transformOps } from "Geometry/Transformation/transformOps";
import type { SerializedItemData } from "../BaseItem/BaseItem";
import { UpdateHint } from "../BaseItem/UpdateHint";
import { Board } from "../../Board";
import { registerItem } from "../RegisterItem";
import { PlaceholderDataSchema } from "./Placeholder.schema";
import { DefaultTransformationData } from "Geometry/Transformation/TransformationData";

const PlaceholderImg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 11.1L7 9.1L12.5 14.6L16 11.1L19 14.1V5H5V11.1ZM4 3H20C20.2652 3 20.5196 3.10536 20.7071 3.29289C20.8946 3.48043 21 3.73478 21 4V20C21 20.2652 20.8946 20.5196 20.7071 20.7071C20.5196 20.8946 20.2652 21 20 21H4C3.73478 21 3.48043 20.8946 3.29289 20.7071C3.10536 20.5196 3 20.2652 3 20V4C3 3.73478 3.10536 3.48043 3.29289 3.29289C3.48043 3.10536 3.73478 3 4 3ZM15.5 10C15.1022 10 14.7206 9.84196 14.4393 9.56066C14.158 9.27936 14 8.89782 14 8.5C14 8.10218 14.158 7.72064 14.4393 7.43934C14.7206 7.15804 15.1022 7 15.5 7C15.8978 7 16.2794 7.15804 16.5607 7.43934C16.842 7.72064 17 8.10218 17 8.5C17 8.89782 16.842 9.27936 16.5607 9.56066C16.2794 9.84196 15.8978 10 15.5 10Z" fill="white" fill-opacity="0.6"/>
</svg>`;

export interface PlaceholderData {
    readonly itemType: "Placeholder";
    backgroundColor: string;
    icon: string;
    transformation: TransformationData;
    miroData?: unknown;
    [key: string]: unknown;
}

export class Placeholder extends BaseItem<Placeholder> {
    readonly itemType = "Placeholder";
    shapeType: ShapeType = "Rectangle";
    parent = "Board";
    private path = Shapes[this.shapeType].path.copy() as Path;
    readonly subject = new Subject<Placeholder>();
    transformationRenderBlock?: boolean = undefined;
    iconImage?: HTMLImageElement;
    private miroData?: unknown;
    public backgroundColor = "#E5E5EA";
    private icon: string = PlaceholderImg?.toString() || "";

    constructor(
        board: Board,
        id = "",
    ) {
        super(board, id);
        this.updateMbr();
        this.loadIconImage();
    }

    emit(operation: PlaceholderOperation): void {
        if (this.board.events) {
            const command = new PlaceholderCommand([this], operation);
            command.apply();
            this.board.events.emit(operation, command);
        } else {
            this.apply(operation);
        }
    }

    serialize(): SerializedItemData<PlaceholderData> {
        return {
            id: this.id,
            itemType: "Placeholder",
            backgroundColor: this.backgroundColor,
            icon: this.icon,
            transformation: this.transformation.serialize(),
            miroData: this.miroData,
        };
    }

    deserialize(data: SerializedItemData<PlaceholderData> | PlaceholderData): this {
        this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
        this.icon = data.icon ?? this.icon;
        this.miroData = data.miroData;
        if (data.transformation) {
            this.transformation.deserialize(data.transformation);
        }
        this.updateVisuals({ method: "deserialize", class: this.itemType } as any, UpdateHint.FullRebuild);
        return this;
    }

    setId(id: string): this {
        this.id = id;
        this.transformation.setId(id);
        return this;
    }

    getId(): string {
        return this.id;
    }

    apply(opIn: Operation): void {
        const op = opIn as any;
        if (op.method === "setProperty") {
            super.apply(op);
        } else if (op.class === "Placeholder") {
            this.applyPlaceholder(op as PlaceholderOperation);
        } else {
            super.apply(op);
        }

        const hint = this.calculateUpdateHint(op);
        this.updateVisuals(op, hint);
    }

    protected override updateVisuals(_op: any, hint: UpdateHint): void {
        if (hint === UpdateHint.VisualOnly) {
            this.path.setBackgroundColor(this.backgroundColor);
            this.subject.publish(this);
            return;
        }

        this.transformPath();
        this.updateMbr();
        this.subject.publish(this);
    }

    protected override getPropertyUpdateHint(property: string): UpdateHint {
        if (["backgroundColor", "icon", "miroData"].includes(property)) {
            return UpdateHint.VisualOnly;
        }
        return super.getPropertyUpdateHint(property);
    }

    private applyPlaceholder(op: PlaceholderOperation): void {
        switch (op.method) {
            case "setBackgroundColor":
                this.applyBackgroundColor(op.backgroundColor);
                break;
            case "setIcon":
                this.applyIcon(op.icon);
                break;
            case "setMiroData":
                this.applyMiroData(op.miroData);
                break;
        }
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
            class: "Placeholder",
            method: "setBackgroundColor",
            item: [this.getId()],
            backgroundColor,
        });
    }

    getIcon(): string {
        return this.icon;
    }

    private applyIcon(icon: string): void {
        this.icon = icon;
    }

    setIcon(icon: string): void {
        this.emit({
            class: "Placeholder",
            method: "setIcon",
            item: [this.getId()],
            icon,
        });
    }

    getMiroData(): unknown {
        return this.miroData;
    }

    private applyMiroData(miroData: unknown): void {
        this.miroData = miroData;
    }

    setMiroData(miroData: unknown): void {
        this.emit({
            class: "Placeholder",
            method: "setMiroData",
            item: [this.getId()],
            miroData,
        });
    }

    getIntersectionPoints(segment: Line): Point[] {
        return this.mbr.getIntersectionPoints(segment);
    }

    updateMbr(): Mbr {
        const rect = this.path.getMbr();
        const rectOffset = 1 / 2;
        this.mbr.left = rect.left - rectOffset;
        this.mbr.right = rect.right + rectOffset;
        this.mbr.top = rect.top - rectOffset;
        this.mbr.bottom = rect.bottom + rectOffset;
        return this.mbr.copy();
    }

    getNearestEdgePointTo(point: Point): Point {
        return this.path.getNearestEdgePointTo(point);
    }

    getDistanceToPoint(point: Point): number {
        const nearest = this.getNearestEdgePointTo(point);
        return point.getDistance(nearest);
    }

    isUnderPoint(point: Point): boolean {
        return this.path.isUnderPoint(point);
    }

    isNearPoint(point: Point, distance: number): boolean {
        return distance > this.getDistanceToPoint(point);
    }

    isEnclosedOrCrossedBy(rect: Mbr): boolean {
        return this.path.isEnclosedOrCrossedBy(rect);
    }

    isEnclosedBy(rect: Mbr): boolean {
        return this.path.isEnclosedBy(rect);
    }

    isInView(rect: Mbr): boolean {
        return this.isEnclosedOrCrossedBy(rect);
    }

    getNormal(point: Point): GeometricNormal {
        return this.path.getNormal(point);
    }

    getPaths(): Path | Paths {
        return this.path;
    }

    getPath(): Path | Paths {
        return this.path.copy();
    }

    copyPaths(): Path | Paths {
        return this.path.copy();
    }

    isClosed(): boolean {
        return this.path instanceof Path && this.path.isClosed();
    }

    getSnapAnchorPoints(): Point[] {
        const anchorPoints = Shapes[this.shapeType].anchorPoints;
        const points: Point[] = [];
        for (const anchorPoint of anchorPoints) {
            points.push(anchorPoint.getTransformed(this.transformation.toMatrix()));
        }
        return points;
    }

  doResize(
    resizeType: ResizeType,
    pointer: Point,
    mbr: Mbr,
    opposite: Point,
    _startMbr: Mbr,
    timeStamp: number
  ): { matrix: Matrix; mbr: Mbr } {
    const res = getResize(resizeType, pointer, mbr, opposite);
    const prevWorld = this.getWorldMatrix().getMatrixData();
    const worldMatrix = this.getWorldMatrix().copy();
    worldMatrix.translate(res.matrix.translateX, res.matrix.translateY);
    worldMatrix.scale(res.matrix.scaleX, res.matrix.scaleY);

    this.apply(transformOps.move([{
      id: this.id,
      worldMatrix: worldMatrix.getMatrixData(),
      prevWorldMatrix: prevWorld,
    }], timeStamp));

    res.mbr = this.getMbr();
    return res;
  }

    private transformPath(): void {
        this.path = Shapes[this.shapeType].createPath(this.mbr) as Path;
        this.path.transform(this.transformation.toMatrix());
        this.path.setBackgroundColor(this.backgroundColor);
        this.path.setBorderColor("transparent");
    }

    private initPath(): void {
        this.path = Shapes[this.shapeType].createPath(this.mbr) as Path;
    }

    private loadIconImage(): void {
        const blob = new Blob([PlaceholderImg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        this.iconImage = new Image();
        this.iconImage.src = url;

        this.iconImage.onload = () => {
            this.subject.publish(this);
        };

        this.iconImage.onerror = () => {
            console.error("Failed to load icon image.");
        };
    }

    private renderIcon(context: DrawingContext): void {
        if (!this.iconImage) {
            return;
        }
        const mbr = this.getMbr();
        const minSide = Math.min(
            this.getMbr().getWidth(),
            this.getMbr().getHeight()
        );

        let iconSize = Math.floor(minSide / 3);
        if (iconSize % 2 !== 0) {
            iconSize += 1;
        }

        const iconX = mbr.left + (this.getMbr().getWidth() - iconSize) / 2;
        const iconY = mbr.top + (this.getMbr().getHeight() - iconSize) / 2;

        context.ctx.drawImage(this.iconImage, iconX, iconY, iconSize, iconSize);
    }

    private renderShadowShape(context: DrawingContext): void {
        this.path.setShadowBlur(5);
        this.path.setShadowOffsetX(0);
        this.path.setShadowOffsetY(1);
        this.path.setShadowColor("rgba(20, 21, 26, 0.06)");
        this.path.render(context);
        context.ctx.restore();

        this.path.setShadowBlur(3);
        this.path.setShadowOffsetX(0);
        this.path.setShadowOffsetY(1);
        this.path.setShadowColor("rgba(20, 21, 26, 0.1)");
        this.path.render(context);
        context.ctx.restore();
    }

    render(context: DrawingContext): void {
        if (this.transformationRenderBlock) {
            return;
        }

        this.renderShadowShape(context);
        this.renderIcon(context);
    }

    isReady(): boolean {
        return false;
    }

    getLinkTo(): undefined {
        return undefined;
    }

    getRichText(): null {
        return null;
    }
}

export const DefaultPlaceholderData: PlaceholderData = {
    itemType: "Placeholder",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    icon: PlaceholderImg,
    transformation: new DefaultTransformationData(),
};

registerItem({
    item: Placeholder,
    defaultData: DefaultPlaceholderData,
    schema: PlaceholderDataSchema,
});
