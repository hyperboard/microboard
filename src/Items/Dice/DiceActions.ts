import type { ItemActionConfig } from "Items/ItemActions";

// Minimal inline SVGs for dice actions — the UI repo may override these with
// its own icon system if it has a more complete icon library.
const THROW_DICE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="3" ry="3"/>
  <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  <circle cx="7" cy="17" r="1.5" fill="currentColor"/>
  <circle cx="17" cy="17" r="1.5" fill="currentColor"/>
</svg>`;

const ADD_DICE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="16" height="16" rx="2" ry="2"/>
  <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
  <circle cx="13" cy="13" r="1.2" fill="currentColor"/>
  <line x1="19" y1="14" x2="19" y2="22"/>
  <line x1="15" y1="18" x2="23" y2="18"/>
</svg>`;

const BORDER_WIDTH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="3" y1="6" x2="21" y2="6" stroke-width="1"/>
  <line x1="3" y1="12" x2="21" y2="12" stroke-width="2"/>
  <line x1="3" y1="18" x2="21" y2="18" stroke-width="4"/>
</svg>`;

export const diceActions: ItemActionConfig = {
  contextPanel: [
    {
      kind: "custom",
      tooltip: "Throw dice",
      button: { kind: "icon", svg: THROW_DICE_SVG },
      // throwDice() picks a random valueIndex at call time and starts the
      // rotation animation — cannot be setProperty because the value is
      // computed at invocation time and the animation side-effect is not a
      // property mutation.
      methodName: "throwDice",
    },
    {
      kind: "menu",
      tooltip: "Fill color",
      button: { kind: "color", property: "backgroundColor" },
      options: [
        { label: "White",  property: "backgroundColor", value: "#FFFFFF" },
        { label: "Red",    property: "backgroundColor", value: "#FF4444" },
        { label: "Green",  property: "backgroundColor", value: "#44BB44" },
        { label: "Blue",   property: "backgroundColor", value: "#4466FF" },
        { label: "Yellow", property: "backgroundColor", value: "#FFDD00" },
        { label: "Black",  property: "backgroundColor", value: "#111111" },
      ],
    },
    {
      kind: "menu",
      tooltip: "Border color",
      button: { kind: "color", property: "borderColor" },
      options: [
        { label: "Black",  property: "borderColor", value: "#000207" },
        { label: "White",  property: "borderColor", value: "#FFFFFF" },
        { label: "Red",    property: "borderColor", value: "#FF4444" },
        { label: "Blue",   property: "borderColor", value: "#4466FF" },
        { label: "None",   property: "borderColor", value: "transparent" },
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
  ],

  contextMenu: [
    {
      kind: "custom",
      tooltip: "Throw dice",
      button: { kind: "icon", svg: THROW_DICE_SVG },
      methodName: "throwDice",
    },
  ],

  toolButton: {
    toolName: "AddDice",
    tooltip: "Add Dice",
    svg: ADD_DICE_SVG,
  },
};
