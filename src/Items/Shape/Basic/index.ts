import { ArrowLeft } from "./ArrowLeft";
import { ArrowLeftRight } from "./ArrowLeftRight";
import { ArrowRight } from "./ArrowRight";
import { BracesLeft } from "./BracesLeft";
import { BracesRight } from "./BracesRight";
import { Circle } from "./Circle";
import { Cloud } from "./Cloud";
import { Cross } from "./Cross";
import { Cylinder } from "./Cylinder";
import { Hexagon } from "./Hexagon";
import { Octagon } from "./Octagon";
import { Parallelogram } from "./Parallelogram";
import { Pentagon } from "./Pentagon";
import { Rhombus } from "./Rhombus";
import { RoundedRectangle } from "./RoundedRectangle";
import { SpeachBubble } from "./SpeachBubble";
import { Star } from "./Star";
import { Trapezoid } from "./Trapezoid";
import { Rectangle } from "./Rectangle";
import { Triangle } from "./Triangle";
import { PredefinedProcess } from "./PredefinedProcess";
import {Sticker} from "./Sticker";

export const Shapes = {
	Rectangle,
	Triangle,
	Circle,
	ArrowLeft,
	ArrowLeftRight,
	ArrowRight,
	BracesLeft,
	BracesRight,
	Cloud,
	Cross,
	Cylinder,
	Hexagon,
	Octagon,
	Parallelogram,
	Pentagon,
	PredefinedProcess,
	Rhombus,
	RoundedRectangle,
	SpeachBubble,
	Star,
	Trapezoid,
	Sticker
} as const;

export type ShapeType = keyof typeof Shapes;
