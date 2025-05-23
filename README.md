# Vending Machine Product Overlay (JavaScript/HTML5 Canvas)

## Overview
This feature dynamically overlays product images onto a base vending machine image (`images/s65lfts.png`). The entire process is handled directly in the web browser using JavaScript and an HTML5 canvas element within the `index.html` file. No backend or Python scripts are required for the image overlay functionality.

## Implementation Details

*   **`index.html`**:
    *   This is the main file to open in your browser.
    *   It contains an HTML5 `<canvas id="vendingMachineCanvas">` element with dimensions 985x985 pixels, which serves as the drawing surface. This canvas is positioned at the bottom of the page content, after the main ELO game interface elements.
    *   All the JavaScript logic required for the overlay and interactivity is embedded within this file.

*   **JavaScript Logic** (embedded within `index.html`):
    *   **`slotConfig` Array**: A JavaScript array named `slotConfig` is defined directly in the script. This array holds the configuration for each of the 30 product slots. Each object in the array specifies:
        *   `id`: A unique identifier for the slot (e.g., `1`, `2`).
        *   `centerX`, `centerY`: The center coordinates for placing the product image within the canvas.
        *   `width`, `height`: The dimensions (width and height) of the product image in the slot. These are predefined based on whether the slot is "big" (112x102 pixels) or "small" (59x53 pixels), according to the specified layout (12 big, 4 small, 2 big, 8 small, 4 big).
        *   `imageSrc`: The path to the product image (e.g., `images/1.png`).
    *   **Image Preloading**: Before any drawing occurs, the script preloads all necessary images: the base vending machine image and all 30 product images specified in `slotConfig`. This ensures that images are ready and available when drawing begins, preventing visual glitches.
    *   **Canvas Drawing**:
        1.  Once all images are preloaded, the base vending machine image (`images/s65lfts.png`) is drawn onto the canvas first, covering its full dimensions.
        2.  Then, the script iterates through the `slotConfig` array. For each slot, it draws the corresponding product image.
        3.  The product images are drawn at coordinates calculated from their `centerX`, `centerY`, `width`, and `height`, effectively resizing them to fit their designated slot and positioning them correctly.
    *   **Interactive Features**:
        *   **Click-to-Rank**: Users can click directly on product images displayed on the vending machine canvas.
        *   When a product on the canvas is clicked, its ELO score in the ELO game is incremented by 5 points.
        *   This ELO score update is then persisted using the ELO game's existing `updateItems()` function, which also handles refreshing the ELO game display.

## Image Files

*   **`images/s65lfts.png`**: This is the base image of the vending machine without any products. It is used as the background on the canvas.
*   **`images/1.png`, `images/2.png`, ..., `images/30.png`**: These are the individual product images.
    *   They must be placed in the `images/` directory.
    *   The filename (e.g., `1.png`) must correspond to the `id` specified in the `slotConfig` objects.

## Usage

1.  Ensure all product images (e.g., `1.png`, `2.png`, ..., `30.png`) are present in the `images/` directory.
2.  Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Safari, Edge).
3.  The vending machine with overlaid products will be displayed on the page.

## Customization

*   **Slot Configuration**: To change the position, dimensions, or number of product slots, you need to modify the `slotConfig` JavaScript array directly within the `<script>` section of the `index.html` file.
*   **Product Images**:
    *   Product images must be named according to their slot ID (e.g., `1.png` for the product in the slot with `id: 1`).
    *   Ensure the `imageSrc` paths in the `slotConfig` array correctly point to your image files if you change naming or directory structure (though sticking to `images/[id].png` is recommended).
*   **Base Image**: If you change the base vending machine image, ensure its dimensions match the canvas dimensions (985x985 pixels) for optimal display, or adjust the canvas dimensions in `index.html` and potentially the drawing logic.
