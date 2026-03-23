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

interface ActiveComponent {
	nodeIds: Set<string>;
	/** Edge-to-edge target gap for springs in this component (auto-calibrated from avg node size). */
	targetGap: number;
}

export class ForceGraphEngine {
	private velocities = new Map<string, Velocity>();
	private tickTimer: ReturnType<typeof setInterval> | null = null;
	private syncTimer: ReturnType<typeof setInterval> | null = null;
	private lastSyncedPositions = new Map<string, { x: number; y: number }>();

	/** Active components: componentId → { nodeIds, targetGap }
	 *  componentId is the nodeId that was passed to enableForGraph(). */
	private activeComponents = new Map<string, ActiveComponent>();

	/** Set to true while we are emitting a physics sync operation, so the
	 *  board-event subscription below doesn't double-update lastSyncedPositions. */
	private isPhysicsEmit = false;

	private readonly TICK_MS = 33;
	private readonly SYNC_MS = 300;
	private readonly MIN_MOVE_PX = 0.05;

	constructor(private board: Board) {
		// Keep lastSyncedPositions aligned with the server when any OTHER operation
		// (drag, resize, undo, collaboration) moves a tracked item.
		// Without this, delta-based sync accumulates error whenever outside operations
		// change the item position between physics sync cycles.
		board.events.subject.subscribe(event => {
			if (this.isPhysicsEmit) return;
			const op = event.body?.operation;
			if (!op || op.class !== 'Transformation' || op.method !== 'applyMatrix') return;
			for (const { id, matrix } of (op as ApplyMatrixOperation).items) {
				const last = this.lastSyncedPositions.get(id);
				if (last) {
					this.lastSyncedPositions.set(id, {
						x: last.x + matrix.translateX,
						y: last.y + matrix.translateY,
					});
				}
			}
		});
	}

	// ── Public per-component API ──────────────────────────────────────────────

	/**
	 * Enable force-directed layout for the connected component containing `startNodeId`.
	 * BFS walks the connector graph to find all nodes in the component.
	 * `targetGap` is auto-calibrated from the average node size; callers may override via conf.
	 */
	enableForGraph(startNodeId: string): void {
		// Don't re-enable if already active
		if (this.isNodeInActiveGraph(startNodeId)) return;

		const nodeIds = this.bfsComponent(startNodeId);
		const targetGap = this.calibrateTargetGap(nodeIds);

		this.activeComponents.set(startNodeId, { nodeIds, targetGap });

		// Init velocities and sync baseline for new nodes
		for (const id of nodeIds) {
			if (!this.velocities.has(id)) {
				this.velocities.set(id, { vx: 0, vy: 0 });
			}
			const item = this.board.items.getById(id);
			if (item && !this.lastSyncedPositions.has(id)) {
				const pos = item.transformation.getTranslation();
				this.lastSyncedPositions.set(id, { x: pos.x, y: pos.y });
			}
		}

		this.ensureRunning();
	}

	/**
	 * Disable graph mode for the component containing `nodeId`.
	 * Stops the engine entirely if no components remain active.
	 */
	disableForGraph(nodeId: string): void {
		const compId = this.findComponentId(nodeId);
		if (!compId) return;

		this.activeComponents.delete(compId);

		if (this.activeComponents.size === 0) {
			this.stopTimers();
		}
	}

	isNodeInActiveGraph(nodeId: string): boolean {
		return !!this.findComponentId(nodeId);
	}

	/** Get the current target gap for the component containing `nodeId`. Returns undefined if not active. */
	getComponentTargetGap(nodeId: string): number | undefined {
		const compId = this.findComponentId(nodeId);
		return compId ? this.activeComponents.get(compId)?.targetGap : undefined;
	}

	/** Update the target gap (connector length) for the component containing `nodeId` and re-wake. */
	setComponentTargetGap(nodeId: string, gap: number): void {
		const compId = this.findComponentId(nodeId);
		if (!compId) return;
		const comp = this.activeComponents.get(compId);
		if (!comp) return;
		comp.targetGap = gap;
		this.wake();
	}

	hasActiveComponents(): boolean {
		return this.activeComponents.size > 0;
	}

	/**
	 * Flush pending physics positions immediately.
	 * Call BEFORE a manual drag starts so the server knows the current physics position
	 * before the drag delta is applied on top of it.
	 */
	flushSync(): void {
		this.syncPositions();
	}

	/**
	 * Re-wake physics after a manual drag ends.
	 * Resets sync baseline to the post-drag position so the drag delta
	 * (already sent by the normal operation system) is not double-counted.
	 */
	wake(): void {
		if (this.activeComponents.size === 0) return;
		// Flush physics-only moves of non-dragged nodes that accumulated since the last
		// periodic sync. Without this, movements between the last sync and wake() are
		// discarded when we reset baselines below — the server never receives them.
		this.syncPositions();
		// Reset baseline to current position for all active nodes.
		// flushSync() was called on pointer-down (server knows pre-drag physics position).
		// The drag delta was sent by the normal operation system.
		// Our next sync must start from the post-drag position to avoid double-counting.
		const activeIds = this.getActiveNodeIds();
		for (const item of this.board.items.listAll()) {
			if (!activeIds.has(item.getId())) continue;
			const pos = item.transformation.getTranslation();
			this.lastSyncedPositions.set(item.getId(), { x: pos.x, y: pos.y });
		}
		this.ensureRunning();
	}

	/** Full stop — called when Board destroys the engine. */
	stop(): void {
		this.stopTimers();
		this.syncPositions();
		this.velocities.clear();
		this.lastSyncedPositions.clear();
		this.activeComponents.clear();
	}

	// ── Internal helpers ──────────────────────────────────────────────────────

	private ensureRunning(): void {
		if (this.tickTimer === null) {
			this.tickTimer = setInterval(() => this.tick(), this.TICK_MS);
		}
		if (this.syncTimer === null) {
			this.syncTimer = setInterval(() => this.syncPositions(), this.SYNC_MS);
		}
	}

	private stopTimers(): void {
		if (this.tickTimer !== null) { clearInterval(this.tickTimer); this.tickTimer = null; }
		if (this.syncTimer !== null) { clearInterval(this.syncTimer); this.syncTimer = null; }
	}

	/** Find the componentId (Map key) for the component containing `nodeId`. */
	private findComponentId(nodeId: string): string | undefined {
		for (const [compId, { nodeIds }] of this.activeComponents) {
			if (nodeIds.has(nodeId)) return compId;
		}
		return undefined;
	}

	/** BFS through connector graph starting from `startNodeId`. */
	private bfsComponent(startNodeId: string): Set<string> {
		const visited = new Set<string>();
		const queue = [startNodeId];
		const connectors = this.getConnectors();

		while (queue.length > 0) {
			const nodeId = queue.shift()!;
			if (visited.has(nodeId)) continue;
			visited.add(nodeId);

			for (const connector of connectors) {
				const { startItem, endItem } = connector.getConnectedItems();
				if (startItem?.getId() === nodeId && endItem && !visited.has(endItem.getId())) {
					queue.push(endItem.getId());
				}
				if (endItem?.getId() === nodeId && startItem && !visited.has(startItem.getId())) {
					queue.push(startItem.getId());
				}
			}
		}

		return visited;
	}

	/**
	 * Returns the edge-to-edge rest gap for the component.
	 * Using a fixed gap (conf.FG_TARGET_GAP) keeps spring forces predictable
	 * and ensures fast settling regardless of node size.
	 */
	private calibrateTargetGap(_nodeIds: Set<string>): number {
		return conf.FG_TARGET_GAP;
	}

	private getActiveNodeIds(): Set<string> {
		const all = new Set<string>();
		for (const { nodeIds } of this.activeComponents.values()) {
			for (const id of nodeIds) all.add(id);
		}
		return all;
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

	// ── Physics tick ──────────────────────────────────────────────────────────
	// Algorithm matches the demo spec: forces applied directly to velocity (implicit dt=1),
	// damping applied per tick, energy = Σ(|vx|+|vy|).

	private tick(): void {
		const activeIds = this.getActiveNodeIds();
		const draggedIds = this.board.getDraggedItemIds();
		const allNodes = this.getNodes();

		// Build snapshots for ALL active nodes (including dragged) so dragged positions
		// influence spring/repulsion forces on their neighbours.
		const snapMap = new Map<string, NodeSnapshot>();
		for (const item of allNodes) {
			if (!activeIds.has(item.getId())) continue;
			const pos = item.transformation.getTranslation();
			const mbr = item.getMbr();
			const w = Math.max(mbr.getWidth(), 1);
			const h = Math.max(mbr.getHeight(), 1);
			snapMap.set(item.getId(), { id: item.getId(), cx: pos.x + w * 0.5, cy: pos.y + h * 0.5, w, h });
		}
		const snap = Array.from(snapMap.values());
		if (snap.length < 1) return;

		// UnionFind for same-component repulsion gate
		const uf = new UnionFind();
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (startItem && endItem) uf.union(startItem.getId(), endItem.getId());
		}

		const ax = new Map<string, number>();
		const ay = new Map<string, number>();
		for (const s of snap) { ax.set(s.id, 0); ay.set(s.id, 0); }

		// ── A. Spring forces along connectors ────────────────────────────────
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (!startItem || !endItem) continue;
			const s1 = snapMap.get(startItem.getId());
			const s2 = snapMap.get(endItem.getId());
			if (!s1 || !s2) continue;

			const dx = s2.cx - s1.cx;
			const dy = s2.cy - s1.cy;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;

			const compId = this.findComponentId(s1.id);
			const targetGap = compId
				? (this.activeComponents.get(compId)?.targetGap ?? conf.FG_TARGET_GAP)
				: conf.FG_TARGET_GAP;
			// Size-aware target: half the larger dim of each node + gap between edges
			const targetDist = (Math.max(s1.w, s1.h) + Math.max(s2.w, s2.h)) * 0.5 + targetGap;

			const force = (dist - targetDist) * conf.FG_SPRING_K;
			const fx = (dx / dist) * force;
			const fy = (dy / dist) * force;

			ax.set(s1.id, (ax.get(s1.id) ?? 0) + fx);
			ay.set(s1.id, (ay.get(s1.id) ?? 0) + fy);
			ax.set(s2.id, (ax.get(s2.id) ?? 0) - fx);
			ay.set(s2.id, (ay.get(s2.id) ?? 0) - fy);
		}

		// ── B. Repulsion — only within same connected component ───────────────
		// fx = dx * R/distSq  ≡  (dx/dist) * R/dist  →  force magnitude ∝ 1/dist
		for (let i = 0; i < snap.length; i++) {
			for (let j = i + 1; j < snap.length; j++) {
				const s1 = snap[i];
				const s2 = snap[j];
				if (!uf.sameComponent(s1.id, s2.id)) continue;

				const dx = s2.cx - s1.cx;
				const dy = s2.cy - s1.cy;
				const distSq = Math.max(dx * dx + dy * dy, conf.FG_MIN_DIST_SQ);
				const force = conf.FG_REPULSION / distSq;

				ax.set(s1.id, (ax.get(s1.id) ?? 0) - dx * force);
				ay.set(s1.id, (ay.get(s1.id) ?? 0) - dy * force);
				ax.set(s2.id, (ax.get(s2.id) ?? 0) + dx * force);
				ay.set(s2.id, (ay.get(s2.id) ?? 0) + dy * force);
			}
		}

		// ── C. Integrate: vx = (vx + fx) * DAMPING; x += vx  (implicit dt=1) ─
		let totalEnergy = 0;

		for (const item of allNodes) {
			const id = item.getId();
			if (!activeIds.has(id)) continue;
			if (!this.velocities.has(id)) this.velocities.set(id, { vx: 0, vy: 0 });
			const vel = this.velocities.get(id)!;

			const isDragged = draggedIds.has(id) ||
				(item.parent !== 'Board' && draggedIds.has(item.parent));

			if (isDragged) {
				// Kinematic anchor: position controlled by the drag system, no physics movement.
				vel.vx = 0;
				vel.vy = 0;
				continue;
			}

			vel.vx = (vel.vx + (ax.get(id) ?? 0)) * conf.FG_DAMPING;
			vel.vy = (vel.vy + (ay.get(id) ?? 0)) * conf.FG_DAMPING;

			if (Math.abs(vel.vx) >= this.MIN_MOVE_PX || Math.abs(vel.vy) >= this.MIN_MOVE_PX) {
				// Only count nodes that actually produce visible movement toward the sleep threshold.
				// Nodes with sub-pixel velocity would inflate totalEnergy and prevent sleep.
				totalEnergy += Math.abs(vel.vx) + Math.abs(vel.vy);
				item.transformation.applyMatrixSilent({
					translateX: vel.vx,
					translateY: vel.vy,
					scaleX: 1, scaleY: 1, shearX: 0, shearY: 0,
				});
			}
		}

		// ── D. Sleep when settled ─────────────────────────────────────────────
		if (totalEnergy < conf.FG_SLEEP_THRESHOLD && this.tickTimer !== null) {
			this.stopTimers();
			this.syncPositions();
		}
	}

	// ── Network sync ──────────────────────────────────────────────────────────

	private syncPositions(): void {
		const activeIds = this.getActiveNodeIds();
		// Exclude dragged items (selected or unselected drag) — their movement is
		// sent by the normal drag system; including them would double-count the delta.
		const draggedIds = this.board.getDraggedItemIds();
		const nodes = this.getNodes().filter(item =>
			activeIds.has(item.getId()) &&
			!draggedIds.has(item.getId()) &&
			!(item.parent !== 'Board' && draggedIds.has(item.parent)),
		);
		if (nodes.length === 0) return;

		// IMPORTANT: only update lastSyncedPositions for items that actually get sent.
		// If we updated the baseline for sub-threshold items too, small movements would
		// never accumulate into a sendable delta → cumulative desync with server.
		const toSend: { id: string; dx: number; dy: number; x: number; y: number }[] = [];
		for (const item of nodes) {
			const id = item.getId();
			const pos = item.transformation.getTranslation();
			const last = this.lastSyncedPositions.get(id);
			const dx = last ? pos.x - last.x : 0;
			const dy = last ? pos.y - last.y : 0;
			if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
				toSend.push({ id, dx, dy, x: pos.x, y: pos.y });
			}
			// Sub-threshold items: do NOT update baseline so delta keeps accumulating.
		}

		if (toSend.length === 0) return;

		// Commit baseline only for items being sent.
		for (const { id, x, y } of toSend) {
			this.lastSyncedPositions.set(id, { x, y });
		}

		const operation: ApplyMatrixOperation = {
			class: 'Transformation',
			method: 'applyMatrix',
			items: toSend.map(({ id, dx, dy }) => ({
				id,
				matrix: { translateX: dx, translateY: dy, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
			})),
		};

		this.isPhysicsEmit = true;
		this.board.events.emit(operation);
		this.isPhysicsEmit = false;
	}
}
