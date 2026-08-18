# Plan: Transform to SPECTRE FOFFEE Mobile Store

Convert the current profile screen into a fully functional mobile coffee shop experience inside the existing phone mockup frame, maintaining the glassmorphic dark theme and Brazilian Portuguese localization.

## Proposed Changes

### Navigation and Structure
- Add a bottom navigation bar (Home, Shop, Cart, Profile) using glassmorphic styling.
- Implement a simple state-based view switcher to toggle between the "Profile" (current) and a new "Shop" view.

### Shop View Content
- **Header**: "Loja SPECTRE" with search icon.
- **Categories**: Horizontal scrolling list (Cafés, Grãos, Acessórios, Comidas).
- **Product Grid**: 2-column layout showing coffee products.
    - Each item: Image, Name, Price (e.g., R$ 18,90), "Add to Cart" glass button.
- **Cart Summary**: A small floating indicator showing items added.

### UI Enhancements
- Maintain the phone mockup frame and all animations.
- Ensure "SPECTRE FOFFEE" branding remains consistent.
- All labels in Brazilian Portuguese.

## Technical Details
- Use React `useState` for view management.
- Define a products array for the shop items.
- Reuse `.glass` utility classes for new shop components.
- Keep the liquid glass effect active across new elements.
