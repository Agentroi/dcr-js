# dcr-js Design Guide

This document captures the design patterns used throughout dcr-js. All new components should follow these patterns for consistency.

## Colors

| Name | Value | Usage |
|------|-------|-------|
| Primary | `black` / `#000` | Text, borders, active states |
| Background | `white` / `#fff` | Component backgrounds |
| Hover | `gainsboro` / `#dcdcdc` | Hover backgrounds |
| Border | `#e0e0e0` | Subtle borders (chat bubbles, inputs) |
| Shadow | `grey` | Box shadows on hover |

**No semantic colors** (red/green/yellow) are used in the core UI. States are indicated through:
- Filled vs outlined
- Black vs white inversion
- Border weight or style

## Typography

- **Font family**: `'IBM Plex Sans', sans-serif`
- **Sizes**: 
  - Headers: 14px (bold)
  - Body: 13px
  - Small: 11-12px
  - Labels: 10px

## Icon Buttons (TopRightIcons style)

```css
background-color: white;
border: 2px solid black;
border-radius: 50%;
padding: 5px;
width: 30px;
height: 30px;
cursor: pointer;

&:hover {
  box-shadow: 0px 0px 5px 0px grey;
}
```

**Active state** (when clicked/selected):
```css
background-color: black;
color: white;
```

## Menu Items

```css
padding: 1rem;
cursor: pointer;

&:hover {
  color: white;
  background-color: gainsboro;
}
```

## Inputs

```css
border: 1px solid #ccc;
border-radius: 4px;
padding: 8px 12px;

&:focus {
  outline: none;
  border-color: black;
}
```

## Buttons (Regular)

```css
background: black;
color: white;
border: none;
border-radius: 4px;
padding: 8px 12px;
font-weight: 600;

&:hover {
  background: #333;
}

&:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

**Secondary/Outline button:**
```css
background: white;
color: black;
border: 2px solid black;

&:hover {
  background: #f0f0f0;
}
```

## Toggle/State Indicator

For indicating state (like permission levels), use text with border:
```css
padding: 3px 8px;
border: 1px solid black;
border-radius: 4px;
font-size: 10px;
cursor: pointer;

/* Active state */
background: black;
color: white;
```

Cycle through states on click. No colors - just black/white inversion.

## Panels/Cards

```css
background: white;
border: 2px solid black;
border-radius: 8px;
box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
```

## Shadows

- **Elevated components**: `box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15)`
- **Hover states**: `box-shadow: 0px 0px 5px 0px grey`

## Z-Index Scale

| Level | Value | Usage |
|-------|-------|-------|
| Base | 0 | Normal content |
| Elevated | 10 | Dropdowns, tooltips |
| Modal | 14 | Chat sidebar |
| Overlay | 15 | TopRightIcons, toggle button |
| Dialog | 20 | Modals, overlays |

## Animation

- **Transitions**: `0.2s ease` for simple state changes
- **No elaborate animations** - keep it snappy

## Don't

- Don't use semantic colors (red/green/yellow) for states
- Don't use rounded corners > 8px (except 50% for circular icons)
- Don't add new fonts
- Don't use gradients
- Don't use elaborate shadows or effects
