# Validation Styles Guide

## Overview
All user-fillable form blocks follow a consistent validation pattern inspired by ValidatedInput/ValidatedTextarea components.

## Validation States

### Valid State (✓)
- **Border**: Green (`border-green-500`)
- **Background**: Light green tint (`bg-green-500/5`)
- **Label indicator**: Green checkmark icon (`CheckCircle2`)
- **Text hints**: Default muted color (`text-muted-foreground`)
- **Border width**: `border-2`

Example:
```html
<div className="rounded-lg border-2 border-green-500 bg-green-500/5 p-4">
  <label className="flex items-center justify-between">
    Field Name <span className="text-destructive">*</span>
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  </label>
  {/* content */}
</div>
```

### Invalid State (!)
- **Border**: Red (`border-red-500`)
- **Background**: Light red tint (`bg-red-500/5`)
- **Label indicator**: Red alert icon (`AlertCircle`)
- **Text hints**: Red text (`text-red-500 font-medium`)
- **Help text**: Red highlight for requirements (`text-red-500`)
- **Border width**: `border-2`

Example:
```html
<div className="rounded-lg border-2 border-red-500 bg-red-500/5 p-4">
  <label className="flex items-center justify-between">
    Field Name <span className="text-destructive">*</span>
    <AlertCircle className="h-5 w-5 text-red-500" />
  </label>
  <p className="text-red-500 font-medium text-sm">
    Add at least 2 items (2–5 total)
  </p>
  {/* content */}
</div>
```

## Components Using This Pattern

### 1. CoreBrand (Brand Basics)
- Uses `ValidatedInput` and `ValidatedTextarea`
- Automatic validation based on VALIDATION_RULES
- Shows checkmark/alert icons in input fields
- Red border when invalid

### 2. ColorPalettePicker (Visual Identity)
- Shows checkmark when 2+ colors selected
- Shows alert icon when < 2 colors
- Outer block border: green when valid, red when invalid
- Red text hints show required color count

### 3. TypographyPicker (Visual Identity)
- Similar pattern to ColorPalettePicker
- Should show validation state when fonts < 1

### 4. Voice (Tone of Voice)
- Form fields already styled with borders
- Consider adding validation state if requirements change

## Implementation Checklist

When adding a new form section:
- [ ] Add outer border container with green/red states
- [ ] Add CheckCircle2/AlertCircle icons to label
- [ ] Make requirement hints red when invalid
- [ ] Use `border-2` for visibility
- [ ] Add light background tint (`/5` opacity)
- [ ] Position icons in top-right corner using `flex justify-between`

## Color References
- Valid green: `border-green-500 bg-green-500/5`
- Invalid red: `border-red-500 bg-red-500/5`
- Icons: `h-5 w-5` sizing
- Text: `text-red-500 font-medium` for invalid hints

## Examples by Component

### ColorPalettePicker
```typescript
const isValid = colors.length >= 2;

<div className={`rounded-lg border-2 p-4 ${
  isValid
    ? "border-green-500 bg-green-500/5"
    : "border-red-500 bg-red-500/5"
}`}>
  {/* Icon in label */}
  {isValid ? <CheckCircle2 /> : <AlertCircle />}
  
  {/* Red text when invalid */}
  {!isValid && (
    <p className="text-red-500 font-medium">
      Add at least 2 colors (2–5 total)
    </p>
  )}
</div>
```

### Future Components
Follow the same pattern for:
- Logo upload validation
- Pattern upload validation  
- Font library validation
- Any other required user input
