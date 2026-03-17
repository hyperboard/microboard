import { Board } from 'Board';
import { ApplyMatrixOperation } from 'Items/Transformation/TransformationOperations';

interface Velocity {
	vx: number;
	vy: number;
}

// Snapshot built each tick from current transformation state (never stale).
interface ItemSnapshot {
	idx: number;  // index into items[]
	id: string;
	left: number;
	top: number;
	right: number;
	bottom: number;
	cx: number;
	cy: number;
	w: number;
	h: number;
	mass: number;
}

// Comment: self-referential transform subscriber → infinite loop on publish.
// Connector: position driven by connected items, not free movement.
const EXCLUDED_ITEM_TYPES = new Set(['Comment', 'Connector']);

export class GravityEngine {
	private velocities = new Map<string, Velocity>();
	private tickTimer: ReturnType<typeof setInterval> | null = null;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private lastSyncedPositions = new Map<string, { x: number; y: number }>();

	readonly G = 80;               // gravitational constant between items
	readonly G_CENTER = 120;       // attraction toward board center
	readonly DAMPING = 0.96;       // velocity damping per tick
	readonly RESTITUTION = 0.5;    // bounce coefficient: 0 = stick, 1 = perfectly elastic
	readonly REPULSION = 200;      // extra spring force on overlap (px/s² per px), on top of bounce
	readonly TICK_MS = 33;         // ~30fps physics
	readonly SYNC_MS = 300;        // network sync interval
	readonly MAX_DISTANCE = 3000;  // gravity cutoff radius
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
		if (this.tickTimer !== null) { clearInterval(this.tickTimer); this.tickTimer = null; }
		if (this.syncTimer !== null) { clearInterval(this.syncTimer); this.syncTimer = null; }
		this.velocities.clear();
		this.lastSyncedPositions.clear();
	}

	private tick(): void {
		const dt = this.TICK_MS / 1000;
		const items = this.board.items.listAll().filter(item =>
			!item.transformation.isLocked && !EXCLUDED_ITEM_TYPES.has(item.itemType));
		if (items.length < 1) return;

		// Build snapshot using transformation.getTranslation() for CURRENT position.
		// getMbr().left/top are stale after applyMatrixSilent (SpatialIndex not updated),
		// but getWidth()/getHeight() are safe — item dimensions don't change during gravity.
		// We reconstruct a fresh AABB: left=translateX, top=translateY, right=left+w, bottom=top+h.
		const snap: ItemSnapshot[] = items.map((item, idx) => {
			const pos = item.transformation.getTranslation();
			const mbr = item.getMbr();
			const w = Math.max(mbr.getWidth(), 1);
			const h = Math.max(mbr.getHeight(), 1);
			return {
				idx,
				id: item.getId(),
				left: pos.x,
				top: pos.y,
				right: pos.x + w,
				bottom: pos.y + h,
				cx: pos.x + w * 0.5,
				cy: pos.y + h * 0.5,
				w, h,
				mass: w * h,
			};
		});

		// Board center = average of current centers
		let sumX = 0, sumY = 0;
		for (const s of snap) { sumX += s.cx; sumY += s.cy; }
		const centerX = sumX / snap.length;
		const centerY = sumY / snap.length;

		for (let i = 0; i < snap.length; i++) {
			const s1 = snap[i];
			if (!this.velocities.has(s1.id)) {
				this.velocities.set(s1.id, { vx: 0, vy: 0 });
			}
			const vel = this.velocities.get(s1.id)!;

			let ax = 0;
			let ay = 0;

			// ── Attraction toward board center ────────────────────────────────
			const dcx = centerX - s1.cx;
			const dcy = centerY - s1.cy;
			const distCenter = Math.sqrt(dcx * dcx + dcy * dcy) + 1;
			ax += this.G_CENTER * dcx / distCenter;
			ay += this.G_CENTER * dcy / distCenter;

			// ── Inter-item forces ─────────────────────────────────────────────
			for (let j = 0; j < snap.length; j++) {
				if (i === j) continue;
				const s2 = snap[j];

				const dx = s2.cx - s1.cx;
				const dy = s2.cy - s1.cy;
				const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

				if (dist > this.MAX_DISTANCE) continue;

				// AABB overlap check using fresh coordinates
				const overlapping =
					s1.right > s2.left &&
					s2.right > s1.left &&
					s1.bottom > s2.top &&
					s2.bottom > s1.top;

				if (overlapping) {
					// Compute overlap depth on each axis (minimum translation vector).
					const overlapX = Math.min(s1.right, s2.right) - Math.max(s1.left, s2.left);
					const overlapY = Math.min(s1.bottom, s2.bottom) - Math.max(s1.top, s2.top);

					if (overlapX < overlapY) {
						const sign = s1.cx < s2.cx ? -1 : 1;
						// Bounce: reflect approach velocity with restitution.
						// This is the core of elastic collision — items bounce instead of sticking.
						if (sign * vel.vx < 0) vel.vx = -vel.vx * this.RESTITUTION;
						// Small extra spring force to fully resolve deep penetration.
						ax += sign * this.REPULSION * overlapX;
					} else {
						const sign = s1.cy < s2.cy ? -1 : 1;
						if (sign * vel.vy < 0) vel.vy = -vel.vy * this.RESTITUTION;
						ay += sign * this.REPULSION * overlapY;
					}
				} else {
					// No overlap → gravitational attraction.
					// Don't apply gravity when nearly touching to prevent velocity buildup
					// that would overwhelm the repulsion impulse on the next tick.
					const touchDist = (s1.w + s2.w + s1.h + s2.h) * 0.25; // approx avg half-extent sum
					if (dist < touchDist + 5) continue;

					const distSq = dx * dx + dy * dy;
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
				matrix: { translateX: dx, translateY: dy, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
			})),
		};

		this.board.events.emit(operation);
	}
}
