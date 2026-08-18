# Plan: Build SPECTRE FOFFEE Mobile Profile Screen

Create a high-fidelity, glassmorphic mobile profile screen for "SPECTRE FOFFEE" inside a phone mockup, localized in Brazilian Portuguese.

## Proposed Changes

### Assets and Styling
- Create CSS files for custom fonts (Neue Haas Unica and Helvetica Now Display) with appropriate fallbacks.
- Update `src/styles.css` to define global CSS variables for the dark/warm theme and implement the requested radial gradients for the page background.
- Implement the `.glass` utility classes (circle, pill, liquid glass effect support).

### Components
- **Index Route (`src/routes/index.tsx`)**: Rewrite the entire page to include:
    - Phone mockup frame (390x844px, 44px border-radius).
    - Hero section with autoplay video and gradient overlay.
    - Identity section with "SPECTRE FOFFEE", laurels, and subtitle.
    - Achievements glass pill.
    - Stats grid with 3 cards (bebidas, sanduíches, cafeterias).
    - Favorite card with latte image and shuffle button.
    - Teaser next card.
- **Liquid Glass Effect**: Implement the displacement map logic in a reusable React hook or component utility.

### SEO and Metadata
- Set page title to "SPECTRE FOFFEE - Perfil" and add relevant meta descriptions in pt-BR.

## Technical Details

### UI Specifications
- **Colors**: `--bg: #180a06`, `--card: rgba(255, 255, 255, 0.06)`, `--text: #ede4d8`, `--muted: rgba(235, 220, 205, 0.55)`.
- **Animations**: Implement `heroReveal`, `dropIn`, and `fadeRise` using Tailwind and Framer Motion (or native CSS keyframes).
- **Responsive**: Scale phone to 0.6x below 440px width.

### Data
- All text strictly in `pt-BR`.
- Brand name: `SPECTRE FOFFEE`.
- Images: Using provided Figma/Cloudfront URLs with high-quality rendering settings (`image-rendering: auto`, `object-fit: contain`).

### Implementation Strategy
1. Configure global styles and fonts.
2. Build the phone mockup shell.
3. Implement the internal screen sections sequentially.
4. Add the liquid glass JavaScript effect.
5. Apply entrance animations.
