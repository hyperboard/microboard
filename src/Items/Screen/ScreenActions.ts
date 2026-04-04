import type { ItemActionConfig } from "Items/ItemActions";

const ADD_SCREEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="3" width="15" height="13" rx="1"/>
  <polyline points="16 8 20 8 23 11 23 19 16 19 16 12"/>
  <line x1="19" y1="14" x2="19" y2="22"/>
  <line x1="15" y1="18" x2="23" y2="18"/>
</svg>`;

const ADD_POUCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
  <line x1="3" y1="6" x2="21" y2="6"/>
  <path d="M16 10a4 4 0 0 1-8 0"/>
</svg>`;

const BORDER_WIDTH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="3" y1="6" x2="21" y2="6" stroke-width="1"/>
  <line x1="3" y1="12" x2="21" y2="12" stroke-width="2"/>
  <line x1="3" y1="18" x2="21" y2="18" stroke-width="4"/>
</svg>`;

export const screenActions: ItemActionConfig = {
  contextPanel: [
    {
      kind: "menu",
      tooltip: "Fill color",
      button: { kind: "color", property: "backgroundColor" },
      options: [
        { label: "White",       property: "backgroundColor", value: "#FFFFFF" },
        { label: "Light grey",  property: "backgroundColor", value: "#F0F0F0" },
        { label: "Dark",        property: "backgroundColor", value: "#222222" },
        { label: "Transparent", property: "backgroundColor", value: "none" },
      ],
    },
    {
      kind: "menu",
      tooltip: "Border color",
      button: { kind: "color", property: "borderColor" },
      options: [
        { label: "Black",       property: "borderColor", value: "#000000" },
        { label: "White",       property: "borderColor", value: "#FFFFFF" },
        { label: "Grey",        property: "borderColor", value: "#888888" },
        { label: "None",        property: "borderColor", value: "transparent" },
      ],
    },
    {
      kind: "menu",
      tooltip: "Border width",
      button: { kind: "icon", svg: BORDER_WIDTH_SVG },
      options: [
        { label: "None",   property: "borderWidth", value: 0 },
        { label: "Thin",   property: "borderWidth", value: 1 },
        { label: "Medium", property: "borderWidth", value: 2 },
        { label: "Thick",  property: "borderWidth", value: 4 },
      ],
    },
    // Background image URL is set via setProperty too, but requires a
    // file-picker UI. The UI repo should detect property === "backgroundUrl"
    // and open a media picker rather than a simple text input.
    {
      kind: "setProperty",
      tooltip: "Set background image",
      button: { kind: "icon", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>` },
      property: "backgroundUrl",
      value: "", // placeholder — UI must open a file picker and set the actual URL
    },
  ],

  contextMenu: [
    {
      kind: "menu",
      tooltip: "Fill color",
      button: { kind: "color", property: "backgroundColor" },
      options: [
        { label: "White",       property: "backgroundColor", value: "#FFFFFF" },
        { label: "Transparent", property: "backgroundColor", value: "none" },
      ],
    },
  ],

  toolButton: {
    toolName: "AddScreen",
    tooltip: "Add Screen (private area)",
    svg: ADD_SCREEN_SVG,
  },
};

/**
 * Action config for the AddPouch tool — a Screen with no owner restriction.
 * Registered separately because it uses the same Screen item type but a
 * different tool.
 */
export const pouchToolButton = {
  toolName: "AddPouch",
  tooltip: "Add Pouch (shared container)",
  svg: ADD_POUCH_SVG,
};
