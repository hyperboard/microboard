import { Board } from 'Board';
import { Item } from 'Items';
import { ApplyMatrixOperation } from 'Items/Transformation/TransformationOperations';

interface Velocity {
	vx: number;
	vy: number;
}

export class GravityEngine {
	private velocities = new Map<string, Velocity>();
	private tickTimer: ReturnType<typeof setInterval> | null = null;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private lastSyncedPositions = new Map<string, { x: number; y: number }>();

	readonly G = 500;              // gravitational constant (tunable)
	readonly DAMPING = 0.98;       // velocity damping per tick (prevents runaway acceleration)
	readonly TICK_MS = 33;         // physics at ~30fps
	readonly SYNC_MS = 300;        // network sync every 300ms
	readonly MAX_DISTANCE = 3000;  // max gravity influence radius in world px
	readonly SOFTENING_SQ = 50 * 50; // epsilon² prevents singularity at close range
	readonly MIN_MOVE_PX = 0.1;    // skip applying sub-pixel movements

	constructor(private board: Board) {}

	start(): void {
		if (this.tickTimer !== null) return;

		for (const item of this.board.items.listAll()) {
			this.velocities.set(item.getId(), { vx: 0, vy: 0 });
		}

		this.tickTimer = setInterval(() => this.tick(), this.TICK_MS);
		this.syncTimer = setInterval(() => this.syncPositions(), this.SYNC_MS);
	}

	stop(): void {
		if (this.tickTimer !== null) {
			clearInterval(this.tickTimer);
			this.tickTimer = null;
		}
		if (this.syncTimer !== null) {
			clearInterval(this.syncTimer);
			this.syncTimer = null;
		}
		this.velocities.clear();
		this.lastSyncedPositions.clear();
	}

	private tick(): void {
		const dt = this.TICK_MS / 1000;
		const items = this.board.items.listAll().filter(item => !item.transformation.isLocked);
		if (items.length < 2) return;

		for (const item of items) {
			const id = item.getId();
			if (!this.velocities.has(id)) {
				this.velocities.set(id, { vx: 0, vy: 0 });
			}
			const vel = this.velocities.get(id)!;

			const pos1 = item.transformation.getTranslation();
			const mbr1 = item.getMbr();
			const mass1 = mbr1.getWidth() * mbr1.getHeight();

			// Use spatial index to skip items beyond MAX_DISTANCE
			const nearby = this.board.items.getEnclosedOrCrossed(
				pos1.x - this.MAX_DISTANCE,
				pos1.y - this.MAX_DISTANCE,
				pos1.x + this.MAX_DISTANCE * 2,
				pos1.y + this.MAX_DISTANCE * 2,
			).filter((other: Item) => other.getId() !== id);

			let ax = 0;
			let ay = 0;

			for (const other of nearby) {
				const pos2 = other.transformation.getTranslation();
				const mbr2 = other.getMbr();
				const mass2 = mbr2.getWidth() * mbr2.getHeight();

				const dx = pos2.x - pos1.x;
				const dy = pos2.y - pos1.y;
				const distSq = dx * dx + dy * dy + this.SOFTENING_SQ;
				const dist = Math.sqrt(distSq);

				// Gravitational acceleration: a = G * m2 / r² (mass1 cancels out)
				const acc = this.G * mass2 / distSq;
				ax += acc * dx / dist;
				ay += acc * dy / dist;
			}

			vel.vx = (vel.vx + ax * dt) * this.DAMPING;
			vel.vy = (vel.vy + ay * dt) * this.DAMPING;

			const dx = vel.vx * dt;
			const dy = vel.vy * dt;

			if (Math.abs(dx) >= this.MIN_MOVE_PX || Math.abs(dy) >= this.MIN_MOVE_PX) {
				item.transformation.applyMatrixSilent({
					translateX: dx,
					translateY: dy,
					scaleX: 1,
					scaleY: 1,
					shearX: 0,
					shearY: 0,
				});
			}
		}
	}

	private syncPositions(): void {
		const items = this.board.items.listAll().filter(item => !item.transformation.isLocked);
		if (items.length === 0) return;

		const movedItems = items
			.map(item => {
				const id = item.getId();
				const pos = item.transformation.getTranslation();
				const last = this.lastSyncedPositions.get(id);
				const dx = last ? pos.x - last.x : 0;
				const dy = last ? pos.y - last.y : 0;
				this.lastSyncedPositions.set(id, { x: pos.x, y: pos.y });
				return { id, dx, dy };
			})
			.filter(({ dx, dy }) => Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5);

		if (movedItems.length === 0) return;

		const operation: ApplyMatrixOperation = {
			class: 'Transformation',
			method: 'applyMatrix',
			items: movedItems.map(({ id, dx, dy }) => ({
				id,
				matrix: {
					translateX: dx,
					translateY: dy,
					scaleX: 1,
					scaleY: 1,
					shearX: 0,
					shearY: 0,
				},
			})),
		};

		this.board.events.emit(operation);
	}
}
