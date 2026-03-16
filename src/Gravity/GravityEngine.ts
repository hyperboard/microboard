import { Board } from 'Board';
import { ApplyMatrixOperation } from 'Items/Transformation/TransformationOperations';

interface Velocity {
	vx: number;
	vy: number;
}

interface ItemSnapshot {
	id: string;
	cx: number;  // current center x — from transformation.getTranslation() (always up-to-date)
	cy: number;  // current center y
	w: number;
	h: number;
	mass: number;
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
	readonly DAMPING = 0.92;       // velocity damping per tick
	readonly REPULSION = 60000;    // repulsion force when items overlap
	readonly TICK_MS = 33;         // physics at ~30fps
	readonly SYNC_MS = 300;        // network sync every 300ms
	readonly MAX_DISTANCE = 3000;  // max gravity influence radius in world px
	readonly SOFTENING_SQ = 50 * 50;
	readonly MIN_MOVE_PX = 0.1;

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

		// Build snapshot using transformation.getTranslation() for CURRENT positions.
		// getMbr() positions are stale after applyMatrixSilent (SpatialIndex not updated),
		// but getWidth()/getHeight() stay correct since item dimensions don't change.
		const snapshot: ItemSnapshot[] = items.map(item => {
			const pos = item.transformation.getTranslation();
			const mbr = item.getMbr();
			const w = Math.max(mbr.getWidth(), 1);
			const h = Math.max(mbr.getHeight(), 1);
			return {
				id: item.getId(),
				cx: pos.x + w * 0.5,
				cy: pos.y + h * 0.5,
				w,
				h,
				mass: w * h,
			};
		});

		// Board center = average of current item centers
		let sumX = 0;
		let sumY = 0;
		for (const s of snapshot) { sumX += s.cx; sumY += s.cy; }
		const centerX = sumX / snapshot.length;
		const centerY = sumY / snapshot.length;

		for (let i = 0; i < snapshot.length; i++) {
			const s1 = snapshot[i];
			if (!this.velocities.has(s1.id)) {
				this.velocities.set(s1.id, { vx: 0, vy: 0 });
			}
			const vel = this.velocities.get(s1.id)!;

			let ax = 0;
			let ay = 0;

			// ── Attraction toward center ──────────────────────────────────────
			const dcx = centerX - s1.cx;
			const dcy = centerY - s1.cy;
			const distCenter = Math.sqrt(dcx * dcx + dcy * dcy) + 1;
			ax += this.G_CENTER * dcx / distCenter;
			ay += this.G_CENTER * dcy / distCenter;

			// ── Inter-item forces (iterate snapshot — avoids stale SpatialIndex) ─
			for (let j = 0; j < snapshot.length; j++) {
				if (i === j) continue;
				const s2 = snapshot[j];

				const dx = s2.cx - s1.cx;
				const dy = s2.cy - s1.cy;
				const distSq = dx * dx + dy * dy;
				const dist = Math.sqrt(distSq) + 0.001;

				if (dist > this.MAX_DISTANCE) continue;

				// Touch threshold: average of half-extents of both items
				const minDist = (s1.w + s2.w + s1.h + s2.h) * 0.25;

				if (dist < minDist) {
					// Overlap → repel
					const repAcc = this.REPULSION / (distSq + this.SOFTENING_SQ);
					ax -= repAcc * dx / dist;
					ay -= repAcc * dy / dist;
				} else {
					// Free space → attract
					const gravAcc = this.G * s2.mass / (distSq + this.SOFTENING_SQ);
					ax += gravAcc * dx / dist;
					ay += gravAcc * dy / dist;
				}
			}

			vel.vx = (vel.vx + ax * dt) * this.DAMPING;
			vel.vy = (vel.vy + ay * dt) * this.DAMPING;

			const moveX = vel.vx * dt;
			const moveY = vel.vy * dt;

			if (Math.abs(moveX) >= this.MIN_MOVE_PX || Math.abs(moveY) >= this.MIN_MOVE_PX) {
				items[i].transformation.applyMatrixSilent({
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
