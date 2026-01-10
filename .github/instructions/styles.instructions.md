---
applyTo: 'src/styles/**/*.css'
---

# CSS and Styling Guidelines

## General Principles

- Follow existing naming conventions in the codebase
- Use kebab-case for class names (e.g., `main-container`, `button-primary`)
- Keep styles modular and organized by component/feature
- Maintain consistency with existing design patterns

## Responsive Design

- Ensure layouts work on different screen sizes
- Use CSS media queries for breakpoints
- Test on both desktop (Electron) and web browsers
- Consider minimum window sizes for Electron app

## CSS Organization

- Group related styles together
- Use comments to separate major sections
- Keep specificity low (avoid deeply nested selectors)
- Avoid !important unless absolutely necessary

## Modern CSS Features

- Use CSS custom properties (variables) for consistency
- Use Flexbox and Grid for layouts
- Use modern units (rem, em, vh, vw) appropriately
- Leverage CSS animations and transitions for smooth UX

## Browser Compatibility

- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Electron uses Chromium, so latest CSS features are available
- Avoid vendor prefixes unless needed for specific features
- Test in both web and Electron environments

## Performance

- Minimize use of expensive properties (box-shadow, filter on scroll)
- Avoid layout thrashing (batch DOM reads/writes)
- Use `will-change` sparingly and only when needed
- Optimize animations (use transform and opacity when possible)

## Accessibility

- Ensure sufficient color contrast
- Don't rely solely on color to convey information
- Maintain focus indicators for keyboard navigation
- Use appropriate cursor styles (pointer for clickable elements)

## Dark Mode / Theming

- If adding theme support, use CSS variables
- Consider system preferences (prefers-color-scheme)
- Maintain readability in all themes
- Test with both light and dark backgrounds

## Code Style

- Use consistent indentation (2 or 4 spaces as per existing files)
- Add spaces in selectors and properties for readability
- Order properties logically (positioning, box model, visual, typography)
- Remove unused CSS rules
