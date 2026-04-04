/**
 * ItemActions — declarative descriptor for item-specific UI actions.
 *
 * The UI repo reads these configs from the `itemActions` registry (keyed by
 * `itemType`) and renders context panels, context menus, and tool panel buttons
 * without any item-specific knowledge.
 *
 * Operation primitive hierarchy:
 *  1. `setProperty` — the primary primitive for most property mutations.
 *     Emits `{ class: "Item", method: "setProperty", property, value }`.
 *  2. `custom` — escape hatch for operations that cannot be expressed as
 *     setProperty (see docs on each `CustomAction` below).
 */

// ---------------------------------------------------------------------------
// Button variants — describe the visual appearance of an action's trigger
// ---------------------------------------------------------------------------

/** A plain SVG icon button. */
export interface IconButton {
  kind: "icon";
  /** Inline SVG markup (full `<svg>` element). */
  svg: string;
}

/**
 * A button whose icon displays the current value of a color property.
 * The UI reads `item[property]` to fill the color swatch.
 */
export interface ColorButton {
  kind: "color";
  /** Property name on the item that holds the current color string. */
  property: string;
}

/**
 * A button whose label displays the current value of a property.
 * Useful for numeric or text property indicators.
 */
export interface LabelButton {
  kind: "label";
  /** Property name on the item to read for display. */
  property: string;
}

export type ButtonVariant = IconButton | ColorButton | LabelButton;

// ---------------------------------------------------------------------------
// Action kinds
// ---------------------------------------------------------------------------

/**
 * A single option inside a `MenuAction` dropdown.
 * When selected, emits `setProperty(property, value)`.
 */
export interface MenuOption {
  /** Display label for this option. */
  label: string;
  /** Property name on the item to set. */
  property: string;
  /** The value to assign to the property. */
  value: unknown;
}

/**
 * A button that opens a dropdown of fixed options.
 * Each option emits a `setProperty` operation when chosen.
 */
export interface MenuAction {
  kind: "menu";
  tooltip: string;
  button: ButtonVariant;
  options: MenuOption[];
}

/**
 * A button that directly emits `setProperty(property, value)` when clicked.
 */
export interface SetPropertyAction {
  kind: "setProperty";
  tooltip: string;
  button: ButtonVariant;
  /** Property name on the item to set. */
  property: string;
  /** The value to assign to the property. */
  value: unknown;
}

/**
 * Escape hatch for operations that CANNOT be expressed as `setProperty`.
 *
 * These are complex operations, typically on container/group items, where:
 * - The value must be computed at invocation time (e.g. random dice value), OR
 * - The operation involves reading and mutating children, OR
 * - The operation affects multiple items simultaneously with interdependent
 *   state (e.g. flip all cards in a deck).
 *
 * Known cases:
 *
 * **Dice**
 * - `throwDice`: generates a random valueIndex at call time + triggers a
 *   timed rotation animation. The value is not known statically.
 *
 * **Card**
 * - `toggleIsOpen(cards)`: operates on the entire selection of Card items
 *   simultaneously; must inspect each card's current `isOpen` state to decide
 *   which cards to open and which to close. Cannot be expressed as setProperty
 *   because the value to write depends on reading the current value first.
 *
 * **Deck** (group item — all operations involve child management)
 * - `shuffleDeck`: randomly reorders children within the container and
 *   triggers a shuffle animation.
 * - `flipDeck`: reverses child insertion order AND toggles face/back state
 *   on all contained cards.
 * - `getTopCard`: removes the top child card from the Deck container and
 *   places it on the board at a computed position. Involves spatial math.
 * - `getBottomCard`: same as getTopCard but for the bottom card.
 * - `getRandomCard`: same but for a random card.
 *
 * The UI calls `(item as any)[methodName]()` for these actions. They are
 * public methods on the item class. The UI repo's ActionRenderer component
 * should handle this with a thin `custom` branch.
 */
export interface CustomAction {
  kind: "custom";
  tooltip: string;
  button: ButtonVariant;
  /**
   * Name of the public method to call on the item instance.
   * Must be a method on the item class.
   */
  methodName: string;
}

export type ItemAction = MenuAction | SetPropertyAction | CustomAction;

// ---------------------------------------------------------------------------
// Tool panel definition
// ---------------------------------------------------------------------------

/**
 * Defines the toolbar entry for items that have a placement tool (e.g. "Add Dice").
 * The UI panel renders a button for each registered item that has a `toolButton`.
 */
export interface ToolPanelButton {
  /**
   * Must match the `toolData.name` passed to `registerItem`.
   * Used to activate the tool via `board.tools.activate(toolName)`.
   */
  toolName: string;
  /** Tooltip / accessible label for the tool panel button. */
  tooltip: string;
  /** Inline SVG markup for the button icon. */
  svg: string;
  /** Optional keyboard shortcut labels for display only. */
  hotkey?: { windows: string; mac: string };
}

// ---------------------------------------------------------------------------
// Top-level config
// ---------------------------------------------------------------------------

/**
 * Complete action descriptor for an item type.
 * Register via `registerItem({ actions: config })`.
 * Read from `itemActions[itemType]` in the UI repo.
 */
export interface ItemActionConfig {
  /**
   * Actions shown in the floating context panel when this item type is selected.
   * Rendered left-to-right as a row of buttons.
   */
  contextPanel: ItemAction[];

  /**
   * Actions shown in the right-click context menu for this item type.
   * A subset of contextPanel actions plus any menu-only actions.
   */
  contextMenu: ItemAction[];

  /**
   * If this item has an "Add" placement tool, this defines its tool panel entry.
   * Absent for items that cannot be placed by the user directly.
   */
  toolButton?: ToolPanelButton;
}
