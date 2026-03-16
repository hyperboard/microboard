import { Board } from 'Board';
import { Item } from 'Items';
import { ApplyMatrixOperation } from 'Items/Transformation/TransformationOperations';

interface Velocity {
	vx: number;
	vy: number;
}

// Comment has a self-referential transform subscriber that causes infinite loops on publish.
// Connector positions are driven by connected items, not by free movement.
const EXCLUDED_ITEM_TYPES = new Set(['Comment', 'Connector']);

export class GravityEngine {
	private velocities = new Map<string, Velocity>();
	private tickTimer: ReturnType<typeof setInterval> | null = null;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private lastSyncedPositions = new Map<string, { x: number; y: number }>();

	readonly G = 80;               // gravitational constant between items
	readonly G_CENTER = 120;       // attraction strength toward board center
	readonly DAMPING = 0.92;       // velocity damping per tick (higher = slower)
	readonly REPULSION = 60000;    // repulsion force when items overlap
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
		const items = this.board.items.listAll().filter(item =>
			!item.transformation.isLocked && !EXCLUDED_ITEM_TYPES.has(item.itemType));
		if (items.length < 1) return;

		// Board center = average position of all items
		let sumX = 0;
		let sumY = 0;
		for (const item of items) {
			const pos = item.transformation.getTranslation();
			sumX += pos.x;
			sumY += pos.y;
		}
		const centerX = sumX / items.length;
		const centerY = sumY / items.length;

		for (const item of items) {
			const id = item.getId();
			if (!this.velocities.has(id)) {
				this.velocities.set(id, { vx: 0, vy: 0 });
			}
			const vel = this.velocities.get(id)!;

			const pos1 = item.transformation.getTranslation();
			const mbr1 = item.getMbr();
			const w1 = mbr1.getWidth();
			const h1 = mbr1.getHeight();

			let ax = 0;
			let ay = 0;

			// ── Attraction toward center ──────────────────────────────────────
			const dcx = centerX - pos1.x;
			const dcy = centerY - pos1.y;
			const distCenter = Math.sqrt(dcx * dcx + dcy * dcy) + 1;
			ax += this.G_CENTER * dcx / distCenter;
			ay += this.G_CENTER * dcy / distCenter;

			// ── Inter-item gravity + collision repulsion ──────────────────────
			const nearby = this.board.items.getEnclosedOrCrossed(
				pos1.x - this.MAX_DISTANCE,
				pos1.y - this.MAX_DISTANCE,
				pos1.x + this.MAX_DISTANCE * 2,
				pos1.y + this.MAX_DISTANCE * 2,
			).filter((other: Item) => other.getId() !== id && !EXCLUDED_ITEM_TYPES.has(other.itemType));

			for (const other of nearby) {
				const pos2 = other.transformation.getTranslation();
				const mbr2 = other.getMbr();
				const w2 = mbr2.getWidth();
				const h2 = mbr2.getHeight();
				const mass2 = w2 * h2;

				const dx = pos2.x - pos1.x;
				const dy = pos2.y - pos1.y;
				const distSq = dx * dx + dy * dy;
				const dist = Math.sqrt(distSq) + 0.001;

				// Minimum separation distance: half-extents sum of both items
				const minDist = (w1 + w2) * 0.5 + (h1 + h2) * 0.5;

				if (dist < minDist) {
					// Overlap → repel
					const repAcc = this.REPULSION / (distSq + this.SOFTENING_SQ);
					ax -= repAcc * dx / dist;
					ay -= repAcc * dy / dist;
				} else {
					// No overlap → attract
					const gravAcc = this.G * mass2 / (distSq + this.SOFTENING_SQ);
					ax += gravAcc * dx / dist;
					ay += gravAcc * dy / dist;
				}
			}

			vel.vx = (vel.vx + ax * dt) * this.DAMPING;
			vel.vy = (vel.vy + ay * dt) * this.DAMPING;

			const moveX = vel.vx * dt;
			const moveY = vel.vy * dt;

			if (Math.abs(moveX) >= this.MIN_MOVE_PX || Math.abs(moveY) >= this.MIN_MOVE_PX) {
				item.transformation.applyMatrixSilent({
					translateX: moveX,
					translateY: moveY,
					scaleX: 1,
					scaleY: 1,
					shearX: 0,
					shearY: 0,
				});
			}
		}
	}

	private syncPositions(): void {
		const items = this.board.items.listAll().filter(item =>
			!item.transformation.isLocked && !EXCLUDED_ITEM_TYPES.has(item.itemType));
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
