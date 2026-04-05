import type { BaseItem } from "Items/BaseItem/BaseItem";

export type OverlayValueSource =
  | { kind: "itemProperty"; property: string }
  | { kind: "toolProperty"; property: string };

export interface OverlayIconStateHint {
  swatch?: OverlayValueSource;
  note?: string;
}

export type OverlayIcon =
  | {
      kind: "asset";
      path: string;
      mimeType?: "image/svg+xml";
      state?: OverlayIconStateHint;
    }
  | {
      kind: "symbol";
      key: string;
      state?: OverlayIconStateHint;
    };

export interface OverlayOptionDefinition {
  id: string;
  label: string;
  value: unknown;
  icon?: OverlayIcon;
  description?: string;
}

export interface OverlayCatalogDefinition {
  kind: "catalog";
  label: string;
  family?: string;
  options: OverlayOptionDefinition[];
  description?: string;
}

interface OverlayEditorBase {
  label?: string;
  description?: string;
}

export interface OverlayColorEditor extends OverlayEditorBase {
  kind: "color";
  palette?: string[];
  allowTransparent?: boolean;
}

export interface OverlayEnumIconEditor extends OverlayEditorBase {
  kind: "enum-icon";
  options: OverlayOptionDefinition[];
  catalog?: OverlayCatalogDefinition;
}

export interface OverlayEnumListEditor extends OverlayEditorBase {
  kind: "enum-list";
  options: OverlayOptionDefinition[];
}

export interface OverlayNumberEditor extends OverlayEditorBase {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface OverlayNumberStepperEditor extends OverlayEditorBase {
  kind: "number-stepper";
  min?: number;
  max?: number;
  step: number;
  presets?: number[];
  unit?: string;
}

export interface OverlaySliderEditor extends OverlayEditorBase {
  kind: "slider";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface OverlayDynamicOptionsEditor extends OverlayEditorBase {
  kind: "dynamic-options";
  providerId: string;
  presentation: "list" | "icon-grid";
}

export interface OverlayToggleEditor extends OverlayEditorBase {
  kind: "toggle";
  trueLabel?: string;
  falseLabel?: string;
}

export interface OverlayCatalogEditor extends OverlayEditorBase {
  kind: "catalog";
  family?: string;
  options: OverlayOptionDefinition[];
  presentation?: "grid" | "list";
}

export type OverlayEditor =
  | OverlayColorEditor
  | OverlayEnumIconEditor
  | OverlayEnumListEditor
  | OverlayNumberEditor
  | OverlayNumberStepperEditor
  | OverlaySliderEditor
  | OverlayDynamicOptionsEditor
  | OverlayToggleEditor
  | OverlayCatalogEditor;

export type OverlayInvocationArg =
  | { kind: "control"; controlId: string }
  | { kind: "static"; value: unknown };

export type OverlayControlValueAdapter =
  | { kind: "rangeArray"; start: number }
  | { kind: "identity" };

export type OverlayInvocation =
  | { kind: "setProperty"; property: string }
  | { kind: "operation"; class: string; method: string; args?: OverlayInvocationArg[] }
  | { kind: "customMethod"; methodName: string; args?: OverlayInvocationArg[] }
  | { kind: "selectionMethod"; methodName: string; args?: OverlayInvocationArg[] }
  | { kind: "toolProperty"; property: string };

export interface OverlayControlDefinition {
  id: string;
  label: string;
  valueSource?: OverlayValueSource;
  icon?: OverlayIcon;
  editor: OverlayEditor;
  valueAdapter?: OverlayControlValueAdapter;
  invoke?: OverlayInvocation;
}

export interface OverlayControlGroupDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  controlIds: string[];
  description?: string;
}

export type OverlayActionTarget = "single" | "each" | "selection";

export interface OverlayActionDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  target: OverlayActionTarget;
  description?: string;
  invoke?: OverlayInvocation;
  controls?: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
}

export interface ItemOverlayDefinition {
  itemType: string;
  actions: OverlayActionDefinition[];
}

export interface SelectionOverlayActionDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  description?: string;
  invoke: OverlayInvocation;
  controls?: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
  isAvailable?: (items: readonly BaseItem[]) => boolean;
}

export interface ToolDefaultsDefinition {
  controls: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
}

export interface ToolOverlayDefinition {
  toolName: string;
  label: string;
  kind: "mode" | "create";
  icon: OverlayIcon;
  family?: string;
  description?: string;
  createsItemType?: string;
  defaults?: ToolDefaultsDefinition;
}
