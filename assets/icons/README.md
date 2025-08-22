# Extension Icons

This directory contains the icons for the LinkedIn Post Consolidation Chrome Extension.

## Required Icon Sizes

Chrome extensions require the following icon sizes:
- `icon-16.png` - 16x16 pixels (toolbar icon)
- `icon-32.png` - 32x32 pixels (Windows)
- `icon-48.png` - 48x48 pixels (extension management page)
- `icon-128.png` - 128x128 pixels (Chrome Web Store)

## Icon Design

The icon design features:
- LinkedIn blue background (#0077B5)
- Document stack representing post consolidation
- Export arrow indicating data export functionality
- Small "in" indicator for LinkedIn branding

## Generating Icons

### Method 1: Using the HTML Generator
1. Open `create-icons.html` in a web browser
2. The page will automatically generate and download all required icon sizes
3. Save the downloaded files in this directory

### Method 2: Manual Creation
1. Use the `icon.svg` file as a base
2. Export to PNG at the required sizes using any vector graphics editor (Inkscape, Adobe Illustrator, etc.)
3. Ensure the exported files are named correctly:
   - `icon-16.png`
   - `icon-32.png` 
   - `icon-48.png`
   - `icon-128.png`

### Method 3: Online Converter
1. Upload `icon.svg` to an online SVG to PNG converter
2. Generate the required sizes
3. Download and rename the files appropriately

## Icon Guidelines

- Use PNG format for all icon files
- Maintain the aspect ratio (square)
- Ensure icons are crisp at all sizes
- Test icons in both light and dark Chrome themes
- Follow Chrome extension icon best practices

## Current Status

- ✅ SVG source file created (`icon.svg`)
- ✅ HTML generator created (`create-icons.html`)
- ⏳ PNG files need to be generated using one of the methods above

## Notes

The icons are designed to be recognizable at small sizes while maintaining the LinkedIn branding and clearly indicating the extension's purpose of consolidating and exporting LinkedIn posts.