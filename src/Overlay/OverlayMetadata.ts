import type { BaseItem } from "Items/BaseItem/BaseItem";

export type OverlayValueSource =
  | { kind: "itemProperty"; property: string }
  | { kind: "toolProperty"; property: string }
  | { kind: "selectionProperty"; property: string };

export type OverlayCondition =
  | { kind: "equals"; source: OverlayValueSource; value: unknown }
  | { kind: "truthy"; source: OverlayValueSource }
  | { kind: "falsy"; source: OverlayValueSource }
  | { kind: "itemTypeIn"; itemTypes: string[] }
  | { kind: "selectionSize"; min?: number; max?: number }
  | { kind: "allOf"; conditions: OverlayCondition[] }
  | { kind: "anyOf"; conditions: OverlayCondition[] }
  | { kind: "not"; condition: OverlayCondition };

export interface OverlayIconStateHint {
  swatch?: OverlayValueSource;
  note?: string;
}

export type OverlayIcon =
  | {
      kind: "asset";
      path: string;
      sourcePath?: string;
      mimeType?: "image/svg+xml";
      state?: OverlayIconStateHint;
    }
  | {
      kind: "symbol";
      key: string;
      sourcePath?: string;
      state?: OverlayIconStateHint;
    };

export interface OverlayOptionDefinition {
  id: string;
  label: string;
  value: unknown;
  icon?: OverlayIcon;
  description?: string;
  family?: string;
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
  presentation?: "circle" | "square" | "sticker";
}

export interface OverlayQuickOptionsDefinition {
  family?: string;
  optionIds?: string[];
  maxVisible?: number;
  overflow?: "clip" | "scroll" | "show-more";
}

export interface OverlayEnumIconEditor extends OverlayEditorBase {
  kind: "enum-icon";
  options: OverlayOptionDefinition[];
  catalog?: OverlayCatalogDefinition;
  layout?: "row" | "grid" | "list";
  quickOptions?: OverlayQuickOptionsDefinition;
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

export interface OverlayAssetUploadFieldDefinition {
  id: string;
  label: string;
  description?: string;
  accept?: string[];
  multiple?: boolean;
  required?: boolean;
}

export interface OverlayAssetUploadEditor extends OverlayEditorBase {
  kind: "asset-upload";
  mode: "single" | "multiple" | "paired";
  accept?: string[];
  fields?: OverlayAssetUploadFieldDefinition[];
}

export interface OverlayWorkflowPropertyBinding {
  property: string;
  source:
    | { kind: "controlValue"; controlId: string }
    | { kind: "uploadField"; controlId: string; fieldId?: string };
}

export interface OverlayWorkflowCreateItemsSubmission {
  kind: "create-items";
  itemType: string;
  strategy?: "single" | "per-upload-entry";
  placement?: "center-viewport" | "stagger-from-pointer";
  properties: OverlayWorkflowPropertyBinding[];
}

export type OverlayWorkflowSubmission = OverlayWorkflowCreateItemsSubmission;

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
  | OverlayAssetUploadEditor
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
  when?: OverlayCondition;
}

export interface OverlayControlGroupDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  controlIds: string[];
  description?: string;
  when?: OverlayCondition;
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
  when?: OverlayCondition;
}

export interface OverlayActionSectionDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  actionIds: string[];
  description?: string;
}

export interface ItemOverlayDefinition {
  itemType: string;
  actions: OverlayActionDefinition[];
  sections?: OverlayActionSectionDefinition[];
}

export interface SelectionOverlayActionDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  description?: string;
  invoke: OverlayInvocation;
  controls?: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
  sectionId?: string;
  order?: number;
  isAvailable?: (items: readonly BaseItem[]) => boolean;
}

export interface ToolDefaultsDefinition {
  controls: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
}

export interface OverlayWorkflowDefinition {
  kind: "property-sheet";
  controls: OverlayControlDefinition[];
  groups?: OverlayControlGroupDefinition[];
  submitLabel?: string;
  description?: string;
  submit?: OverlayWorkflowSubmission;
}

export interface OverlayToolGroupDefinition {
  id: string;
  label: string;
  icon?: OverlayIcon;
  description?: string;
  order?: number;
  behavior?: "open-panel" | "activate-last-used";
}

export interface OverlayToolSurfaceDefinition {
  order?: number;
  group?: OverlayToolGroupDefinition;
  relatedToolNames?: string[];
}

export type OverlayToolLaunchDefinition =
  | { kind: "activate-tool" }
  | { kind: "workflow"; workflow: OverlayWorkflowDefinition };

export interface ToolOverlayDefinition {
  toolName: string;
  label: string;
  kind: "mode" | "create";
  icon: OverlayIcon;
  family?: string;
  description?: string;
  createsItemType?: string;
  defaults?: ToolDefaultsDefinition;
  launch?: OverlayToolLaunchDefinition;
  surface?: OverlayToolSurfaceDefinition;
}
