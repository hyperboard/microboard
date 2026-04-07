# Overlay Icon SVG Reference

This document lists the actual icon assets used by the overlay surfaces in this repository and pins them to their local source.

It exists so the core library can become the source of:

- tool and action descriptions
- item and parameter metadata
- actual icon assets

The goal is that this UI repo can stay generic and render future core-defined item types without adding new icon knowledge here.

## 1. Source Files

Overlay icon assets currently come from these local files:

- [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)
- [Icon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/Icon.tsx)
- [ShapeIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ShapeIcon.tsx)
- [FrameIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FrameIcon.tsx)
- [ConnectorIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorIcon.tsx)
- [ConnectorPointerIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorPointerIcon.tsx)
- [StrokeColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/StrokeColorIndicator.tsx)
- [TextColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextColorIndicator/TextColorIndicator.tsx)
- [TextHighlightIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextHighlightIndicator/TextHighlightIndicator.tsx)
- [FillColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FillColorIndicator/FillColorIndicator.tsx)

## 2. Overlay Icon Inventory

### 2.1 Toolbar and launcher icons

- `Select`
- `GameItems`
- `Pen`
- `Highlighter`
- `Eraser`
- `Text`
- `Shape`
- `Connector`
- `Sticker`
- `Frame`
- `AddMedia`
- `Image`
- `Audio`
- `Video`
- `Template`
- `Dice`
- `Card`
- `AddScreen`
- `AddPouch`

### 2.2 Text and formatting icons

- `TextStyle`
- `TextBold`
- `TextItalic`
- `TextUnderline`
- `TextStrike`
- `TextAlignLeft`
- `TextAlignCenter`
- `TextAlignRight`
- `VerticalAlignTop`
- `VerticalAlignCenter`
- `VerticalAlignBottom`
- `TextColor`
- `TextHighlight`
- `BulletedList`
- `NumberedList`

### 2.3 Shape, frame, connector, pointer, and stroke families

Shape quick-picker family:

- `Rectangle`
- `RoundedRectangle`
- `Circle`
- `Triangle`
- `Rhombus`
- `SpeachBubble`
- `ArrowRight`
- `ArrowLeft`
- `Cloud`
- `Parallelogram`
- `Star`
- `BracesRight`
- `BracesLeft`
- `ArrowLeftRight`
- `Cross`
- `Cylinder`
- `Trapezoid`
- `PredefinedProcess`
- `Octagon`
- `Hexagon`
- `Pentagon`

Frame picker family:

- `FrameCustom`
- `FrameA4`
- `FrameLetter`
- `FrameFrame16x9`
- `FrameFrame4x3`
- `FrameFrame1x1`
- `FrameFrame9x18`
- `FrameFrame3x2`

Connector line-style family:

- `straight`
- `curved`
- `orthogonal`

Connector pointer family:

- `None`
- `ArrowBroad`
- `ArrowThin`
- `TriangleFilled`
- `CircleFilled`
- `Angle`
- `TriangleEmpty`
- `DiamondFilled`
- `DiamondEmpty`
- `Zero`
- `One`
- `Many`
- `ManyMandatory`
- `OneMandatory`
- `ManyOptional`
- `OneOptional`

Stroke-style family:

- `SolidLine`
- `DashedLine`
- `DottedLine`

### 2.4 Context-panel and overflow icons

- `Delete`
- `Duplicate`
- `Dots`
- `BringToFront`
- `SendToBack`
- `CopyLink`
- `SaveAsImage`
- `Save`
- `AddText`
- `Switch`
- `Chevron`
- `lock`
- `unlock`
- `LockFrameLocked`
- `LockFrameUnlocked`
- `ArrowUp`
- `HyperlinkIcon`
- `addLink`
- `RotateDice`
- `RotateCard`
- `ShuffleDeck`
- `GetCard`
- `GetBottomCard`
- `GetRandomItem`
- `SpreadCards`
- `Stack`
- `Gear`

## 3. Rendering Contracts In This Repo

### 3.1 Static symbol contract

Most overlay icons are monochrome symbols from [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg) and rely on `currentColor`.

That means the asset contract is:

- core owns the symbol SVG
- UI owns state coloring through CSS color

### 3.2 Typed-family wrappers

The overlay currently resolves family icons through wrapper components:

- [ShapeIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ShapeIcon.tsx): `#${ShapeType}`
- [FrameIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FrameIcon.tsx): `#Frame${FrameType}`
- [ConnectorIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorIcon.tsx): `#${ConnectorLineStyle}`
- [ConnectorPointerIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorPointerIcon.tsx): `#${ConnectorPointerType}`

For core migration, these symbol families should move together with the typed metadata enums that reference them.

### 3.3 Composite indicator icons

Not every overlay icon is a single sprite symbol.

Composite overlay renderers:

- [TextColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextColorIndicator/TextColorIndicator.tsx)
- [TextHighlightIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextHighlightIndicator/TextHighlightIndicator.tsx)
- [FillColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FillColorIndicator/FillColorIndicator.tsx)
- [StrokeColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/StrokeColorIndicator.tsx)

These are part of the overlay icon contract too, but they are not plain `<symbol>` entries.

## 4. Exact SVG Snippets

### 4.1 Toolbar shell symbols

Source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

```xml
<symbol id="Select" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd"
    d="M3.28421 4.30174C3.55182 4.02741 3.95268 3.93015 4.31625 4.05135L20.3163 9.38468C20.7064 9.51472 20.9771 9.8703 20.9987 10.2809C21.0202 10.6916 20.7882 11.0736 20.4138 11.2437L20.36 11.2682L20.2042 11.3396C20.069 11.4015 19.8742 11.4912 19.636 11.6017C19.1595 11.8227 18.5109 12.1262 17.8216 12.4571C16.4106 13.1344 14.9278 13.8797 14.3325 14.2765C14.3325 14.2765 14.3258 14.2809 14.308 14.2965C14.2906 14.3118 14.2673 14.3339 14.2382 14.3646C14.1791 14.4267 14.1072 14.5123 14.0231 14.6243C13.8542 14.8496 13.6622 15.1471 13.4541 15.5039C13.0384 16.2164 12.5946 17.1024 12.1833 17.98C11.7735 18.8541 11.4038 19.7031 11.136 20.3348C11.0023 20.6502 10.8944 20.9105 10.8201 21.0915C10.783 21.182 10.7543 21.2525 10.735 21.3002L10.7132 21.3542L10.7066 21.3707C10.5524 21.7561 10.1759 22.0069 9.76082 21.9999C9.34577 21.9928 8.97824 21.7301 8.83725 21.3397L3.05947 5.33967C2.92931 4.97922 3.0166 4.57607 3.28421 4.30174ZM9.85395 18.2666C10.0153 17.9043 10.1898 17.5206 10.3723 17.1312C10.7943 16.231 11.2672 15.2836 11.7265 14.4962C11.9559 14.103 12.191 13.7338 12.4231 13.4243C12.6416 13.133 12.9114 12.8202 13.2231 12.6124C13.9612 12.1204 15.5894 11.3101 16.9562 10.6541C17.0731 10.5979 17.1888 10.5426 17.3027 10.4883L5.64145 6.60126L9.85395 18.2666Z"
    fill="currentColor" />
</symbol>
<symbol id="Pen" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd"
    d="M13.9469 4.12149C15.4393 2.62617 17.8598 2.62617 19.3522 4.12149C20.8437 5.6158 20.8437 8.03779 19.3522 9.5321L10.7898 18.1111L19.5556 18.1111C20.0772 18.1111 20.5 18.5339 20.5 19.0556C20.5 19.5772 20.0772 20 19.5556 20L4.44444 20C3.92284 20 3.5 19.5772 3.5 19.0556L3.5 14.9793C3.5 14.7291 3.59925 14.4892 3.77598 14.3121L13.9469 4.12149ZM8.12108 18.1111L15.6058 10.6119L12.8718 7.87257L5.38889 15.37L5.38889 18.1111H8.12108ZM14.2062 6.53563L16.9402 9.27495L18.0153 8.19774C18.7708 7.4408 18.7708 6.21279 18.0153 5.45584C17.2608 4.6999 16.0383 4.6999 15.2839 5.45584L14.2062 6.53563Z"
    fill="currentColor" />
</symbol>
<symbol id="Highlighter" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd"
    d="M11.7209 15.0883C10.865 15.4714 9.93767 15.6686 9.00002 15.6667C8.06237 15.6686 7.13499 15.4715 6.27919 15.0883L6.55169 10.6667H11.4484L11.7209 15.0883ZM0.666687 9.00001C0.666687 13.6025 4.39752 17.3333 9.00002 17.3333C13.6025 17.3333 17.3334 13.6025 17.3334 9.00001C17.3334 4.39751 13.6025 0.666672 9.00002 0.666672C4.39752 0.666672 0.666687 4.39751 0.666687 9.00001ZM12.1 9.00001H11.5V6.22076C11.5 5.53821 10.8313 5.05624 10.1838 5.27208L7.18379 6.27208C6.77545 6.4082 6.50002 6.79033 6.50002 7.22076V9.00001H5.90002C5.71439 9.0002 5.53414 9.06236 5.38785 9.17664C5.24157 9.29092 5.13763 9.45077 5.09252 9.63084L4.79085 14.17C3.72337 13.3009 2.95109 12.1226 2.58007 10.797C2.20905 9.47141 2.25747 8.06345 2.71869 6.76646C3.17991 5.46947 4.03131 4.34706 5.15599 3.55333C6.28066 2.75961 7.62347 2.33349 9.00002 2.33349C10.3766 2.33349 11.7194 2.75961 12.8441 3.55333C13.9687 4.34706 14.8201 5.46947 15.2813 6.76646C15.7426 8.06345 15.791 9.47141 15.42 10.797C15.0489 12.1226 14.2767 13.3009 13.2092 14.17L12.9084 9.63084C12.8632 9.45063 12.7591 9.29068 12.6127 9.17638C12.4662 9.06209 12.2858 9.00001 12.1 9.00001Z"
    fill="currentColor" />
</symbol>
<symbol id="Eraser" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M6.15498 6.38166L2.02998 10.5067L6.35832 14.835H7.33332V14.8333H8.30998L11.4583 11.685L6.15498 6.38166ZM7.33332 5.20333L12.6366 10.5067L14.9933 8.14916L9.68998 2.84583L7.33332 5.20333ZM10.6666 14.8333H15.6666C16.1269 14.8333 16.5 15.2064 16.5 15.6667C16.5 16.1269 16.1269 16.5 15.6666 16.5H8.99998L5.66832 16.5017L0.262482 11.0958C0.106256 10.9396 0.0184937 10.7276 0.0184937 10.5067C0.0184937 10.2857 0.106256 10.0738 0.262482 9.9175L9.09998 1.07833C9.17738 1.00085 9.26928 0.939383 9.37045 0.897446C9.47161 0.855509 9.58005 0.833923 9.68957 0.833923C9.79908 0.833923 9.90752 0.855509 10.0087 0.897446C10.1098 0.939383 10.2018 1.00085 10.2791 1.07833L16.7608 7.56C16.917 7.71627 17.0048 7.92819 17.0048 8.14916C17.0048 8.37013 16.917 8.58206 16.7608 8.73833L10.6666 14.8333Z"
    fill="currentColor" />
</symbol>
<symbol id="Text" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M13 5.99999V20C13 20.5523 12.5523 21 12 21C11.4478 21 11 20.5523 11 20V5.99999H4.00005C3.44776 5.99999 3.00005 5.55227 3.00005 4.99999C3.00005 4.4477 3.44776 3.99999 4.00005 3.99999H20C20.5523 3.99999 21 4.4477 21 4.99999C21 5.55227 20.5523 5.99999 20 5.99999H13Z"
    fill="currentColor" />
</symbol>
<symbol id="Shape" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd"
    d="M16.5 14.2769V10.5C16.5 8.84315 15.1569 7.5 13.5 7.5H9.72308C9.87861 6.95285 10.1191 6.43025 10.4386 5.95216C11.0414 5.05 11.8982 4.34685 12.9006 3.93163C13.903 3.51641 15.0061 3.40777 16.0703 3.61945C17.1344 3.83112 18.1119 4.35361 18.8792 5.12084C19.6464 5.88806 20.1689 6.86557 20.3806 7.92974C20.5922 8.99392 20.4836 10.097 20.0684 11.0994C19.6532 12.1018 18.95 12.9586 18.0478 13.5614C17.5698 13.8809 17.0471 14.1214 16.5 14.2769ZM16.5 16.3485C17.448 16.155 18.3544 15.7788 19.1668 15.236C20.4001 14.4119 21.3614 13.2406 21.9291 11.8701C22.4968 10.4997 22.6453 8.99168 22.3559 7.53683C22.0665 6.08197 21.3522 4.7456 20.3033 3.6967C19.2544 2.64781 17.918 1.9335 16.4632 1.64411C15.0083 1.35472 13.5003 1.50325 12.1299 2.07091C10.7594 2.63856 9.58809 3.59986 8.76398 4.83323C8.22116 5.64561 7.84504 6.552 7.65153 7.5H4.5C2.84315 7.5 1.5 8.84315 1.5 10.5V19.5C1.5 21.1569 2.84315 22.5 4.5 22.5H13.5C15.1569 22.5 16.5 21.1569 16.5 19.5V16.3485ZM3.5 10.5C3.5 9.94772 3.94772 9.5 4.5 9.5H13.5C14.0523 9.5 14.5 9.94772 14.5 10.5V19.5C14.5 20.0523 14.0523 20.5 13.5 20.5H4.5C3.94772 20.5 3.5 20.0523 3.5 19.5V10.5Z"
    fill="currentColor" />
</symbol>
<symbol id="Connector" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M21.6561 3.74818C21.6854 3.50936 21.4777 3.30677 21.2328 3.33543L15.7634 3.97553C15.448 4.01244 15.2558 4.43304 15.4804 4.65205L17.0968 6.22845L2.56368 20.4021C2.26689 20.6915 2.26689 21.1608 2.56368 21.4503C2.86047 21.7397 3.34165 21.7397 3.63843 21.4503L18.1715 7.27662L19.7862 8.8514C20.0108 9.0704 20.3954 8.94068 20.4332 8.63316L21.6561 3.74818Z"
    fill="currentColor" />
</symbol>
<symbol id="Sticker" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.96 20L20 12.96H14.96C13.8554 12.96 12.96 13.8554 12.96 14.96V20Z" fill="currentColor" />
  <path
    d="M20 12.96V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H12.96M20 12.96L12.96 20M20 12.96H14.96C13.8554 12.96 12.96 13.8554 12.96 14.96V20"
    stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
</symbol>
<symbol id="Frame" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8 8V16H16V8H8ZM6 7C6 6.44771 6.44772 6 7 6H17C17.5523 6 18 6.44772 18 7V17C18 17.5523 17.5523 18 17 18H7C6.44771 18 6 17.5523 6 17V7ZM6 3C6 2.44772 6.44772 2 7 2C7.55228 2 8 2.44772 8 3V4C8 4.55228 7.55228 5 7 5C6.44772 5 6 4.55228 6 4V3ZM6 20C6 19.4477 6.44772 19 7 19C7.55228 19 8 19.4477 8 20V21C8 21.5523 7.55228 22 7 22C6.44772 22 6 21.5523 6 21V20ZM2 7C2 6.44772 2.44772 6 3 6H4C4.55228 6 5 6.44772 5 7C5 7.55228 4.55228 8 4 8H3C2.44772 8 2 7.55228 2 7ZM2 17C2 16.4477 2.44772 16 3 16H4C4.55228 16 5 16.4477 5 17C5 17.5523 4.55228 18 4 18H3C2.44772 18 2 17.5523 2 17ZM19 7C19 6.44772 19.4477 6 20 6H21C21.5523 6 22 6.44772 22 7C22 7.55228 21.5523 8 21 8H20C19.4477 8 19 7.55228 19 7ZM19 17C19 16.4477 19.4477 16 20 16H21C21.5523 16 22 16.4477 22 17C22 17.5523 21.5523 18 21 18H20C19.4477 18 19 17.5523 19 17ZM16 3C16 2.44772 16.4477 2 17 2C17.5523 2 18 2.44772 18 3V4C18 4.55228 17.5523 5 17 5C16.4477 5 16 4.55228 16 4V3ZM16 20C16 19.4477 16.4477 19 17 19C17.5523 19 18 19.4477 18 20V21C18 21.5523 17.5523 22 17 22C16.4477 22 16 21.5523 16 21V20Z"
    fill="currentColor" />
</symbol>
<symbol id="GameItems" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 0C17.5913 0 19.1174 0.632141 20.2426 1.75736C21.3679 2.88258 22 4.4087 22 6V10C22 11.5913 21.3679 13.1174 20.2426 14.2426C19.1174 15.3679 17.5913 16 16 16H6C4.4087 16 2.88258 15.3679 1.75736 14.2426C0.632141 13.1174 0 11.5913 0 10V6C0 4.4087 0.632141 2.88258 1.75736 1.75736C2.88258 0.632141 4.4087 0 6 0H16ZM16 2H6C4.97376 2 3.98677 2.39444 3.24319 3.10172C2.4996 3.80901 2.05631 4.77504 2.005 5.8L2 6V10C2 11.0262 2.39444 12.0132 3.10172 12.7568C3.80901 13.5004 4.77504 13.9437 5.8 13.995L6 14H16C17.0262 14 18.0132 13.6056 18.7568 12.8983C19.5004 12.191 19.9437 11.225 19.995 10.2L20 10V6C20 4.97376 19.6056 3.98677 18.8983 3.24319C18.191 2.4996 17.225 2.05631 16.2 2.005L16 2ZM9 5V7H11V9H8.999L9 11H7L6.999 9H5V7H7V5H9ZM17 9V11H15V9H17ZM15 5V7H13V5H15Z" fill="currentColor"/>
</symbol>
```

### 4.2 Basic shape quick-picker family

Source ids are resolved by [ShapeIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ShapeIcon.tsx).

Exact symbol ids used in the legacy basic quick-picker:

- `Rectangle`
- `RoundedRectangle`
- `Circle`
- `Triangle`
- `Rhombus`
- `SpeachBubble`
- `ArrowRight`
- `ArrowLeft`
- `Cloud`
- `Parallelogram`
- `Star`
- `BracesRight`
- `BracesLeft`
- `ArrowLeftRight`
- `Cross`
- `Cylinder`
- `Trapezoid`
- `PredefinedProcess`
- `Octagon`
- `Hexagon`
- `Pentagon`

Authoritative source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

These exact symbols should move to core as one family alongside shape metadata.

### 4.3 Frame, connector-style, and connector-pointer families

Source ids are resolved by:

- [FrameIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FrameIcon.tsx)
- [ConnectorIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorIcon.tsx)
- [ConnectorPointerIcon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/ConnectorPointerIcon.tsx)

Exact frame ids:

- `FrameCustom`
- `FrameA4`
- `FrameLetter`
- `FrameFrame16x9`
- `FrameFrame4x3`
- `FrameFrame1x1`
- `FrameFrame9x18`
- `FrameFrame3x2`

Exact connector-style ids:

- `straight`
- `curved`
- `orthogonal`

Exact connector-pointer ids:

- `None`
- `ArrowBroad`
- `ArrowThin`
- `TriangleFilled`
- `CircleFilled`
- `Angle`
- `TriangleEmpty`
- `DiamondFilled`
- `DiamondEmpty`
- `Zero`
- `One`
- `Many`
- `ManyMandatory`
- `OneMandatory`
- `ManyOptional`
- `OneOptional`

Authoritative source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

### 4.4 Text-formatting and list icons

Exact symbol ids used by overlay text controls:

- `TextStyle`
- `TextBold`
- `TextItalic`
- `TextUnderline`
- `TextStrike`
- `TextAlignLeft`
- `TextAlignCenter`
- `TextAlignRight`
- `VerticalAlignTop`
- `VerticalAlignCenter`
- `VerticalAlignBottom`
- `TextColor`
- `TextHighlight`
- `BulletedList`
- `NumberedList`
- `HyperlinkIcon`

Authoritative source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

### 4.5 Rest-menu and action icons

Exact symbol ids used by overlay actions and overflow entries:

- `Delete`
- `Duplicate`
- `Dots`
- `BringToFront`
- `SendToBack`
- `CopyLink`
- `SaveAsImage`
- `Save`
- `addLink`
- `AddText`
- `Switch`
- `Chevron`
- `lock`
- `unlock`
- `LockFrameLocked`
- `LockFrameUnlocked`
- `ArrowUp`
- `Gear`

Authoritative source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

### 4.6 Game-item action icons

Exact ids used by the overlay game-item launcher and context rows:

- `Dice`
- `Card`
- `Stack`
- `RotateDice`
- `RotateCard`
- `ShuffleDeck`
- `GetCard`
- `GetBottomCard`
- `GetRandomItem`
- `SpreadCards`
- `AddScreen`
- `AddPouch`

Authoritative source: [sprite.svg](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/sprite.svg)

## 5. Non-Sprite Overlay Icons

These are still part of the overlay icon contract, but they are rendered as React/CSS compositions instead of single sprite symbols.

### 5.1 `StrokeColorIndicator`

Source: [StrokeColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/StrokeColorIndicator.tsx)

This is the exact SVG-based renderer used for stroke-color controls:

```tsx
export function StrokeColorIndicator({ color }: Props): React.ReactElement {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5ZM19.5 10C19.5 15.2467 15.2467 19.5 10 19.5C4.75329 19.5 0.5 15.2467 0.5 10C0.5 4.75329 4.75329 0.5 10 0.5C15.2467 0.5 19.5 4.75329 19.5 10Z"
        fill="url(#pattern0_566_25878)"
      />
      <path
        d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5ZM19.5 10C19.5 15.2467 15.2467 19.5 10 19.5C4.75329 19.5 0.5 15.2467 0.5 10C0.5 4.75329 4.75329 0.5 10 0.5C15.2467 0.5 19.5 4.75329 19.5 10Z"
        fill={color}
      />
    </svg>
  );
}
```

### 5.2 `TextColorIndicator`

Source: [TextColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextColorIndicator/TextColorIndicator.tsx)

Contract:

- base symbol: `TextColor`
- dynamic value layer: bottom color bar

### 5.3 `TextHighlightIndicator`

Source: [TextHighlightIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/TextHighlightIndicator/TextHighlightIndicator.tsx)

Contract:

- base symbol: `TextHighlight`
- dynamic value layer: small colored badge

### 5.4 `FillColorIndicator`

Source: [FillColorIndicator.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/FillColorIndicator/FillColorIndicator.tsx)

Contract:

- pure color chip, not a sprite symbol
- `none` state uses a checker-pattern background

## 6. Migration Boundary For Core

If core is meant to be the true source of overlay definitions, then the following should move together:

- tool/action metadata
- enum/value option metadata
- family icon ids and the SVG assets behind them
- composite icon kind metadata where the icon is not a plain symbol

Minimal icon contract core should expose:

- static symbol asset id
- typed family symbol asset id
- color-indicator composition kind
- swatch-shape kind for non-glyph options like sticker colors

