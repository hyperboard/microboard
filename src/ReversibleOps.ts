import { Operation as SlateOperation } from "slate";

/**
 * Базовый аргумент операции.
 *
 * @typeparam T - Тип данных для прямого и обратного действия операции.
 */
interface OperationArgument<T> {
	/** Уникальный идентификатор элемента, к которому применяется операция. */
	itemId: string;
	/** Данные для прямого действия операции. */
	forward: T;
	/** Данные для обратного действия операции. */
	reverse: T;
}

/**
 * Базовый интерфейс для всех операций.
 *
 * @typeparam T - Тип данных для аргументов операции.
 */
interface Operation<T> {
	/** Тип операции. */
	type: string;
	/** Массив аргументов операции. */
	arguments: OperationArgument<T>[];
}

/**
 * Операция трансформации элемента.
 *
 * @remarks
 * Матрица в этой операции является афинной матрицей трансформации, состоящей из шести элементов.
 * Порядок элементов в матрицы: [a, b, c, d, e, f], где:
 * - a: Горизонтальное масштабирование (Horizontal scaling)
 * - b: Горизонтальный наклон (Horizontal skew)
 * - c: Вертикальный наклон (Vertical skew)
 * - d: Вертикальное масштабирование (Vertical scaling)
 * - e: Горизонтальное смещение (Horizontal translation)
 * - f: Вертикальное смещение (Vertical translation)
 *
 * Этот порядок соответствует порядку, используемому в API WebCanvas.
 *
 * Важно отметить, что эта матрица не является финальной матрицей трансформации элемента.
 * Она должна быть применена к предыдущей матрице трансформации элемента для получения
 * итогового результата.
 */
interface TransformOperation extends Operation<{ matrix: number[] }> {
	type: "Transform";
}

interface EditTextOperation
	extends Operation<{ slateOperations: SlateOperation[] }> {
	type: "EditText";
}

interface SetFillPropertiesOperation
	extends Operation<{
		color?: string;
		opacity?: number;
	}> {
	type: "SetFillProperties";
}

interface SetBorderPropertiesOperation
	extends Operation<{
		color?: string;
		opacity?: number;
		width?: number;
		style?: string;
	}> {
	type: "SetBorderProperties";
}

interface SetConnectorPointOperation
	extends Operation<{
		pointType: "start" | "end";
		itemId: string;
		position: { x: number; y: number };
	}> {
	type: "SetConnectorPoint";
}

interface SetAspectRatioConstraintOperation
	extends Operation<{
		constrained: boolean;
	}> {
	type: "SetAspectRatioConstraint";
}

interface AddChildOperation
	extends Operation<{
		parentId: string;
		childId: string;
	}> {
	type: "AddChild";
}

interface RemoveChildOperation
	extends Operation<{
		parentId: string;
		childId: string;
	}> {
	type: "RemoveChild";
}

interface SetLockOperation
	extends Operation<{
		locked: boolean;
	}> {
	type: "SetLock";
}

/**
 * Операция для изменения Z-индекса элемента.
 *
 * @remarks
 * Новый Z-индекс (newIndex) применяется относительно массива дочерних элементов
 * текущего родителя этого элемента. Если newIndex выходит за пределы допустимого
 * диапазона (например, больше, чем количество элементов у родителя), то элемент
 * будет помещен в конец списка дочерних элементов. Если newIndex отрицательный,
 * элемент будет помещен в начало списка.
 *
 * Эта операция не изменяет родителя элемента. Если элемент был перемещен
 * в другую группу или фрейм после применения этой операции, новый Z-индекс
 * будет интерпретирован в контексте нового родителя при повторном применении операции.
 */
interface SetZIndexOperation
	extends Operation<{
		newIndex: number;
	}> {
	type: "SetZIndex";
}

interface SetShapeTypeOperation
	extends Operation<{
		shapeType: string;
	}> {
	type: "SetShapeType";
}

interface SetLineStyleOperation
	extends Operation<{
		lineStyle: string;
	}> {
	type: "SetLineStyle";
}

interface SetPointerStyleOperation
	extends Operation<{
		pointerType: "start" | "end";
		style: string;
	}> {
	type: "SetPointerStyle";
}

interface AddItemOperation
	extends Operation<{
		itemData: any; // Тип данных элемента
	}> {
	type: "AddItem";
}

interface RemoveItemOperation extends Operation<{}> {
	type: "RemoveItem";
}

export type ReversibleOp =
	| TransformOperation
	| EditTextOperation
	| SetFillPropertiesOperation
	| SetBorderPropertiesOperation
	| SetConnectorPointOperation
	| SetAspectRatioConstraintOperation
	| AddChildOperation
	| RemoveChildOperation
	| SetLockOperation
	| SetZIndexOperation
	| SetShapeTypeOperation
	| SetLineStyleOperation
	| SetPointerStyleOperation
	| AddItemOperation
	| RemoveItemOperation;
