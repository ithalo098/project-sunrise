# Plan - Coffee Tracker Mobile App

Transform the current "SPECTRE FOFFEE" store into a dedicated coffee consumption controller for mobile.

## User Interface Changes

- **Layout**: Change from a fixed phone mockup to a full-screen mobile layout (100vw/100vh) while maintaining the aesthetic.
- **Home View (Tracker)**:
    - Add a large daily consumption goal indicator (e.g., "600ml / 800ml").
    - "Add Coffee" button that opens a logging interface.
    - Quick selection for coffee types (Espresso, Latte, etc.) and sizes (50ml, 150ml, 300ml).
- **History View**: 
    - List of recent consumptions with time, type, and volume.
- **Profile View**: 
    - User stats focused on consumption habits.

## Technical Details

- Remove the `transform: scale(0.78)` and fixed width/height from the main container.
- Update `Index` component state to track `logs` (array of coffee entries).
- Add functionality to calculate total daily volume.
- Update branding and copy to reflect "Controlador de Café" instead of "Loja".

## Components to Create/Update

- `src/routes/index.tsx`: Rewrite to implement the tracker logic and full-screen layout.
- `src/components/CoffeeLogModal.tsx` (optional/inline): A glassmorphic modal for logging.
