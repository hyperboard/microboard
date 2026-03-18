import { Board } from 'Board';
import { conf } from 'Settings';
import { ApplyMatrixOperation } from 'Items/Transformation/TransformationOperations';
import { Connector } from 'Items/Connector/Connector';

// ── Union-Find for connected-component detection ──────────────────────────────
class UnionFind {
	private parent = new Map<string, string>();

	find(id: string): string {
		if (!this.parent.has(id)) this.parent.set(id, id);
		const root = this.parent.get(id)!;
		if (root !== id) {
			const canonical = this.find(root);
			this.parent.set(id, canonical);
			return canonical;
		}
		return root;
	}

	union(a: string, b: string): void {
		const ra = this.find(a);
		const rb = this.find(b);
		if (ra !== rb) this.parent.set(ra, rb);
	}

	sameComponent(a: string, b: string): boolean {
		return this.find(a) === this.find(b);
	}
}

interface Velocity { vx: number; vy: number; }

interface NodeSnapshot {
	id: string;
	cx: number;
	cy: number;
	w: number;
	h: number;
}

// Item types that should not participate in graph physics
const EXCLUDED_TYPES = new Set(['Connector', 'Comment']);

export class ForceGraphEngine {
	private velocities = new Map<string, Velocity>();
	private tickTimer: ReturnType<typeof setInterval> | null = null;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private lastSyncedPositions = new Map<string, { x: number; y: number }>();

	private readonly TICK_MS = 33;
	private readonly SYNC_MS = 300;
	private readonly SOFTENING_SQ = 100 * 100;
	private readonly MIN_MOVE_PX = 0.05;

	constructor(private board: Board) {}

	start(): void {
		if (this.tickTimer !== null) return;

		for (const item of this.getNodes()) {
			const pos = item.transformation.getTranslation();
			this.lastSyncedPositions.set(item.getId(), { x: pos.x, y: pos.y });
			this.velocities.set(item.getId(), { vx: 0, vy: 0 });
		}

		this.tickTimer = setInterval(() => this.tick(), this.TICK_MS);
		this.syncTimer = setInterval(() => this.syncPositions(), this.SYNC_MS);
	}

	stop(): void {
		if (this.tickTimer !== null) { clearInterval(this.tickTimer); this.tickTimer = null; }
		if (this.syncTimer !== null) { clearInterval(this.syncTimer); this.syncTimer = null; }
		this.syncPositions();
		this.velocities.clear();
		this.lastSyncedPositions.clear();
	}

	private getNodes() {
		return this.board.items.listAll().filter(
			item => !EXCLUDED_TYPES.has(item.itemType) && !item.transformation.isLocked
		);
	}

	private getConnectors(): Connector[] {
		return this.board.items.listAll().filter(
			(item): item is Connector => item.itemType === 'Connector'
		);
	}

	private tick(): void {
		const dt = this.TICK_MS / 1000;
		const nodes = this.getNodes();
		if (nodes.length < 2) return;

		// Build fresh snapshots from current transformation state.
		// getMbr().left/top are stale after applyMatrixSilent — use getTranslation() + stable dimensions.
		const snapMap = new Map<string, NodeSnapshot>();
		for (const item of nodes) {
			const pos = item.transformation.getTranslation();
			const mbr = item.getMbr();
			const w = Math.max(mbr.getWidth(), 1);
			const h = Math.max(mbr.getHeight(), 1);
			snapMap.set(item.getId(), {
				id: item.getId(),
				cx: pos.x + w * 0.5,
				cy: pos.y + h * 0.5,
				w, h,
			});
		}
		const snap = Array.from(snapMap.values());

		// ── Build connected components (Union-Find over connector edges) ──────
		// Repulsion is isolated per component — exactly like the demo's graphId.
		// This prevents separate graph clusters from pushing each other apart.
		const uf = new UnionFind();
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (startItem && endItem) {
				uf.union(startItem.getId(), endItem.getId());
			}
		}

		// Accumulate accelerations for this tick
		const ax = new Map<string, number>();
		const ay = new Map<string, number>();
		for (const s of snap) { ax.set(s.id, 0); ay.set(s.id, 0); }

		// ── A. Spring forces along connectors ────────────────────────────────
		// Each connector acts as a spring: Hooke's law F = k * (dist - targetDist).
		// Positive stretch → attract. Negative stretch → repel (already too close).
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (!startItem || !endItem) continue;

			const s1 = snapMap.get(startItem.getId());
			const s2 = snapMap.get(endItem.getId());
			if (!s1 || !s2) continue;

			const dx = s2.cx - s1.cx;
			const dy = s2.cy - s1.cy;
			const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

			// Target = edge-to-edge gap so items don't overlap
			const targetDist = (Math.max(s1.w, s1.h) + Math.max(s2.w, s2.h)) * 0.5 + conf.FG_TARGET_GAP;
			const stretch = dist - targetDist;
			const forceMag = stretch * conf.FG_SPRING_K;

			const fx = (dx / dist) * forceMag;
			const fy = (dy / dist) * forceMag;

			ax.set(s1.id, (ax.get(s1.id) ?? 0) + fx);
			ay.set(s1.id, (ay.get(s1.id) ?? 0) + fy);
			ax.set(s2.id, (ax.get(s2.id) ?? 0) - fx);
			ay.set(s2.id, (ay.get(s2.id) ?? 0) - fy);
		}

		// ── B. Repulsion — only between nodes in the same component ──────────
		// Nodes from different graph clusters don't interact, so clusters stay put.
		for (let i = 0; i < snap.length; i++) {
			for (let j = i + 1; j < snap.length; j++) {
				const s1 = snap[i];
				const s2 = snap[j];

				// Skip nodes from different connected components
				if (!uf.sameComponent(s1.id, s2.id)) continue;

				const dx = s2.cx - s1.cx;
				const dy = s2.cy - s1.cy;
				const distSq = dx * dx + dy * dy + this.SOFTENING_SQ;
				const repMag = conf.FG_REPULSION / distSq;

				const fx = dx * repMag;
				const fy = dy * repMag;

				ax.set(s1.id, (ax.get(s1.id) ?? 0) - fx);
				ay.set(s1.id, (ay.get(s1.id) ?? 0) - fy);
				ax.set(s2.id, (ax.get(s2.id) ?? 0) + fx);
				ay.set(s2.id, (ay.get(s2.id) ?? 0) + fy);
			}
		}

		// ── C. Integrate velocities & positions ───────────────────────────────
		let totalEnergy = 0;

		for (const item of nodes) {
			const id = item.getId();
			if (!this.velocities.has(id)) {
				this.velocities.set(id, { vx: 0, vy: 0 });
			}
			const vel = this.velocities.get(id)!;

			vel.vx = (vel.vx + (ax.get(id) ?? 0) * dt) * conf.FG_DAMPING;
			vel.vy = (vel.vy + (ay.get(id) ?? 0) * dt) * conf.FG_DAMPING;

			totalEnergy += vel.vx * vel.vx + vel.vy * vel.vy;

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

		// ── D. Sleep when settled ─────────────────────────────────────────────
		if (totalEnergy < conf.FG_SLEEP_THRESHOLD && this.tickTimer !== null) {
			clearInterval(this.tickTimer);
			this.tickTimer = null;
			// Flush final positions
			this.syncPositions();
		}
	}

	private syncPositions(): void {
		const nodes = this.getNodes();
		if (nodes.length === 0) return;

		const movedItems = nodes
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

	/** Re-wake the engine after user moves a node (dragging disturbs equilibrium). */
	wake(): void {
		if (this.tickTimer === null && this.syncTimer !== null) {
			// Engine was sleeping but simulation is still "active" (sync timer running)
			this.tickTimer = setInterval(() => this.tick(), this.TICK_MS);
		}
	}
}
