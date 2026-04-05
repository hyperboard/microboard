export enum UpdateHint {
	/** Only position changed. No geometry or layout recalculation needed. */
	TranslateOnly = 'TranslateOnly',
	/** Size, rotation, or shear changed. Geometery (paths, vectors) must be recalculated, but text layout can often be skipped. */
	TransformGeometry = 'TransformGeometry',
	/** Only non-geometric styling properties (colors, opacity) changed. */
	VisualOnly = 'VisualOnly',
	/** Structural change affecting text flow, wrapping, or container bounds. Full layout recalculation needed. */
	LayoutAffecting = 'LayoutAffecting',
	/** Everything changed or fallback for unknown operations. Recalculate all state. */
	FullRebuild = 'FullRebuild',
}
