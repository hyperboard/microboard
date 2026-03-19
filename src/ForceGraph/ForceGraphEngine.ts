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

	private readonly TICK_MS = 33;
	private readonly SYNC_MS = 300;
	private readonly SOFTENING_SQ = 100 * 100;
	private readonly MIN_MOVE_PX = 0.05;

	constructor(private board: Board) {}

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
	 * Auto-calibrate spring target gap from the average max(w, h) of nodes in the component.
	 * Larger nodes → longer springs so items visually breathe.
	 */
	private calibrateTargetGap(nodeIds: Set<string>): number {
		let totalMaxDim = 0;
		let count = 0;
		for (const id of nodeIds) {
			const item = this.board.items.getById(id);
			if (!item) continue;
			const mbr = item.getMbr();
			totalMaxDim += Math.max(mbr.getWidth(), mbr.getHeight());
			count++;
		}
		const avgMaxDim = count > 0 ? totalMaxDim / count : 100;
		// Gap = 150% of avg node size so connectors visually breathe
		return avgMaxDim * 1.5;
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

	private tick(): void {
		const dt = this.TICK_MS / 1000;

		// Only process nodes that belong to active components.
		// Skip dragged items (both selected-drag and unselected-drag) so physics
		// does not fight the user's hand.
		const activeIds = this.getActiveNodeIds();
		const draggedIds = this.board.getDraggedItemIds();
		const allNodes = this.getNodes();
		const nodes = allNodes.filter(item => {
			if (!activeIds.has(item.getId())) return false;
			if (draggedIds.has(item.getId())) return false;
			// If the item lives inside a dragged Group, skip it too
			if (item.parent !== 'Board' && draggedIds.has(item.parent)) return false;
			return true;
		});

		if (nodes.length < 1) return;

		// Build fresh snapshots (getMbr().left/top are stale after applyMatrixSilent)
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

		// Build UnionFind over connector edges (for same-component repulsion check)
		const uf = new UnionFind();
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (startItem && endItem) {
				uf.union(startItem.getId(), endItem.getId());
			}
		}

		const ax = new Map<string, number>();
		const ay = new Map<string, number>();
		for (const s of snap) { ax.set(s.id, 0); ay.set(s.id, 0); }

		// ── A. Spring forces along connectors ─────────────────────────────────
		for (const connector of this.getConnectors()) {
			const { startItem, endItem } = connector.getConnectedItems();
			if (!startItem || !endItem) continue;

			const s1 = snapMap.get(startItem.getId());
			const s2 = snapMap.get(endItem.getId());
			if (!s1 || !s2) continue; // one endpoint is outside active components

			const dx = s2.cx - s1.cx;
			const dy = s2.cy - s1.cy;
			const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

			// Per-component targetGap (auto-calibrated to average node size)
			const compId = this.findComponentId(s1.id);
			const targetGap = compId
				? (this.activeComponents.get(compId)?.targetGap ?? conf.FG_TARGET_GAP)
				: conf.FG_TARGET_GAP;
			const targetDist = (Math.max(s1.w, s1.h) + Math.max(s2.w, s2.h)) * 0.5 + targetGap;

			const stretch = dist - targetDist;
			const forceMag = stretch * conf.FG_SPRING_K;

			const fx = (dx / dist) * forceMag;
			const fy = (dy / dist) * forceMag;

			ax.set(s1.id, (ax.get(s1.id) ?? 0) + fx);
			ay.set(s1.id, (ay.get(s1.id) ?? 0) + fy);
			ax.set(s2.id, (ax.get(s2.id) ?? 0) - fx);
			ay.set(s2.id, (ay.get(s2.id) ?? 0) - fy);
		}

		// ── B. Repulsion — only within same connected component ───────────────
		for (let i = 0; i < snap.length; i++) {
			for (let j = i + 1; j < snap.length; j++) {
				const s1 = snap[i];
				const s2 = snap[j];

				if (!uf.sameComponent(s1.id, s2.id)) continue;

				const dx = s2.cx - s1.cx;
				const dy = s2.cy - s1.cy;
				const centerDist = Math.sqrt(dx * dx + dy * dy) + 0.001;

				// Edge-to-edge distance so large nodes repel with the same visual force as small ones
				const r1 = Math.max(s1.w, s1.h) * 0.5;
				const r2 = Math.max(s2.w, s2.h) * 0.5;
				const edgeDist = Math.max(centerDist - r1 - r2, 1);
				const repMag = conf.FG_REPULSION / (edgeDist * edgeDist + this.SOFTENING_SQ);

				const fx = (dx / centerDist) * repMag;
				const fy = (dy / centerDist) * repMag;

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

		// ── D. Sleep when settled — stop BOTH timers so the sync timer cannot
		// pick up manual item movements (already sent via normal ops) and double-count them.
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
}
