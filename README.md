# Vending Machine Product Overlay (JavaScript/HTML5 Canvas)

## Overview
This feature dynamically overlays product images onto a base vending machine image (`images/s65lfts.png`). The products displayed are determined by the data fetched for the ELO ranking game. The entire process is handled directly in the web browser using JavaScript and an HTML5 canvas element within the `index.html` file.

## Implementation Details

*   **`index.html`**:
    *   The main file for the application.
    *   Contains an HTML5 `<canvas id="vendingMachineCanvas">` (985x985 pixels). This canvas is positioned at the bottom of the page content.
    *   Houses all JavaScript logic for the ELO game and the dynamic canvas overlay.

*   **JavaScript Logic** (embedded within `index.html`):
    *   **Data Fetching (`fetchItems`)**: The ELO game fetches an array of product objects (referred to as `items`). This data is the source of truth for products displayed on the canvas.
    *   **`masterSlotDefinitions` Array**: A static JavaScript array defining the 30 fixed visual slots on the vending machine. Each object in this array specifies:
        *   `visualId`: A unique numeric identifier for the visual slot (1-30).
        *   `slotName`: A human-readable identifier for the slot (e.g., "A1", "B3", "D2"). This is the key for mapping products.
        *   `centerX`, `centerY`: The center coordinates for the slot on the canvas.
        *   `width`, `height`: The dimensions of the slot, determining the size of the product image displayed.
    *   **Dynamic Canvas Initialization (`initializeVendingMachineCanvas`)**:
        *   This function is called after the ELO game's `items` data is successfully fetched.
        *   It takes the fetched `items` as an argument.
    *   **Image Preloading**: The script preloads the base vending machine image and then dynamically preloads product images based on the `id` of each item in the fetched `items` array (e.g., `images/{item.id}.png`).
    *   **Canvas Drawing (`drawVendingMachine`)**:
        1.  The base vending machine image is drawn.
        2.  The script iterates through `masterSlotDefinitions`. For each `masterSlot`:
            *   It searches the fetched `items` array for a product whose `slot` property matches the `masterSlot.slotName` (e.g., `item.slot === "A1"`).
            *   If a matching product is found, its image (e.g., `images/{product.id}.png`) is drawn into the `masterSlot`'s defined position and dimensions.
            *   **Empty Slots**: If no product in the fetched `items` data has a `slot` value corresponding to a `masterSlot.slotName` (e.g., no item with `slot: "D2"`, or if an item for "A1" is missing from the data), that visual slot on the canvas will remain empty (showing only the base machine image).
    *   **Interactive Features**:
        *   **Click-to-Rank**: Clicking a product on the canvas:
            *   Identifies the `masterSlot` clicked.
            *   Finds the product in the fetched `items` data that is currently assigned to that `masterSlot.slotName`.
            *   If a product exists in that slot, its ELO score (from the main `items` array used by the ELO game) is incremented by 5.
            *   The ELO game's `updateItems()` function is called to persist this change.

## Product Data and Image Files

*   **Product Data (Fetched JSON for ELO Game)**:
    *   The content of the canvas is driven by the array of product objects fetched by the ELO game.
    *   Each product object in this data should have an `id` (e.g., `1`, `25`) and a `slot` field (e.g., `"slot": "A1"`, `"slot": "F7"`).
    *   The `id` is used to construct the image filename.
    *   The `slot` field links the product to a specific `slotName` in `masterSlotDefinitions`, determining where it's displayed.
*   **Image Files**:
    *   **`images/s65lfts.png`**: The base vending machine image.
    *   **Product Images (e.g., `images/1.png`, `images/25.png`)**:
        *   Named using the `id` from the product data (e.g., if an item has `id: 25`, its image must be `images/25.png`).
        *   Must be placed in the `images/` directory.

## Usage

1.  Ensure your product data (typically a JSON file fetched by the application, like `items.json` if that's what `jsonbin` serves) contains accurate `id` and `slot` fields for each product you want to display on the canvas.
2.  Ensure corresponding product images (e.g., `images/{item.id}.png`) are present in the `images/` directory.
3.  Open `index.html` in a web browser. The canvas will populate after the product data is fetched.

## Customization

*   **Product Placement on Canvas**: To change which product appears in which slot, modify the `slot` field of the product objects in your primary data source (e.g., the `items.json` file). For example, to move a product to slot "C1", set its `"slot": "C1"` in the JSON data.
*   **Visual Slot Layout (`masterSlotDefinitions`)**:
    *   To change the coordinates, dimensions, or `slotName` identifiers of the visual slots themselves, you need to modify the `masterSlotDefinitions` array in `index.html`. This is for advanced layout changes of the vending machine grid itself.
    *   Ensure `slotName` values in `masterSlotDefinitions` are consistent with the `slot` values used in your product data.
*   **Product Images**: Update image files in `images/` and ensure their names match `item.id.png`.
*   **Base Image**: Changes to `images/s65lfts.png` should maintain dimensions (985x985) or require canvas/logic adjustments.
