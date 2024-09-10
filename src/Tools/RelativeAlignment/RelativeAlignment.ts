import React, { useEffect, useRef, useState } from "react";
import { Item } from "./types";

const ALIGNMENT_THRESHOLD = 5;
const SNAP_THRESHOLD = 5;
const ALIGNMENT_LINES = {
	horizontal: "horizontal",
	vertical: "vertical",
};

const RelativeAlignment: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [items, setItems] = useState<Item[]>([]);
	const [alignmentLines, setAlignmentLines] = useState<
		{ type: string; points: number[] }[]
	>([]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		items.forEach(item => {
			ctx.fillStyle = "blue";
			ctx.fillRect(item.x, item.y, item.width, item.height);
		});

		alignmentLines.forEach(line => {
			ctx.strokeStyle = "red";
			ctx.setLineDash([10, 5]);
			ctx.beginPath();
			ctx.moveTo(line.points[0], line.points[1]);
			ctx.lineTo(line.points[2], line.points[3]);
			ctx.stroke();
		});
	}, [items, alignmentLines]);

	const checkAlignment = (newItems: Item[], movingItem: Item) => {
		const lines: { type: string; points: number[] }[] = [];

		newItems.forEach(otherItem => {
			if (movingItem.id !== otherItem.id) {
				const movingCorners = getCorners(movingItem);
				const otherCorners = getCorners(otherItem);

				movingCorners.forEach(movingCorner => {
					otherCorners.forEach(otherCorner => {
						const dx = Math.abs(movingCorner.x - otherCorner.x);
						const dy = Math.abs(movingCorner.y - otherCorner.y);

						if (dx <= ALIGNMENT_THRESHOLD) {
							lines.push({
								type: ALIGNMENT_LINES.vertical,
								points: [
									movingCorner.x,
									movingCorner.y,
									movingCorner.x,
									otherCorner.y,
								],
							});

							if (dx <= SNAP_THRESHOLD) {
								movingItem.x =
									otherItem.x +
									(movingCorner.x > otherCorner.x
										? otherItem.width
										: -movingItem.width);
							}
						}

						if (dy <= ALIGNMENT_THRESHOLD) {
							lines.push({
								type: ALIGNMENT_LINES.horizontal,
								points: [
									movingCorner.x,
									movingCorner.y,
									otherCorner.x,
									movingCorner.y,
								],
							});

							if (dy <= SNAP_THRESHOLD) {
								movingItem.y =
									otherItem.y +
									(movingCorner.y > otherCorner.y
										? otherItem.height
										: -movingItem.height);
							}
						}
					});
				});
			}
		});

		setAlignmentLines(lines);
	};

	const getCorners = (item: Item) => {
		return [
			{ x: item.x, y: item.y },
			{ x: item.x + item.width, y: item.y },
			{ x: item.x, y: item.y + item.height },
			{ x: item.x + item.width, y: item.y + item.height },
			{ x: item.x + item.width / 2, y: item.y + item.height / 2 },
		];
	};

	// Просто заглушка для обработки перемещения
	// const handleItemMove = (item: Item) => {
	// 	const updatedItems = items.map(i => (i.id === item.id ? item : i));
	// 	setItems(updatedItems);
	// 	checkAlignment(updatedItems, item);
	// };

	return null;
};

export default RelativeAlignment;
