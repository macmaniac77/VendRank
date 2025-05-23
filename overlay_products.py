# Install Pillow if not already installed: pip install Pillow
import json
from PIL import Image
import os

def overlay_products():
    # Load Slot Configuration
    try:
        with open("slot_config.json", 'r') as f:
            slot_configs = json.load(f)
    except FileNotFoundError:
        print("Error: slot_config.json not found.")
        return
    except json.JSONDecodeError:
        print("Error: slot_config.json is not a valid JSON file.")
        return

    # Load Base Image
    base_image_path = "images/s65lfts.png"
    try:
        base_image = Image.open(base_image_path)
        working_image = base_image.copy()
    except FileNotFoundError:
        print(f"Error: Base image {base_image_path} not found.")
        return

    # Create images directory if it doesn't exist for the output
    if not os.path.exists("images"):
        os.makedirs("images")

    # Process Each Slot
    for slot in slot_configs:
        slot_id = slot.get("slot_id")
        width = slot.get("width")
        height = slot.get("height")
        top_left_x = slot.get("top_left_x")
        top_left_y = slot.get("top_left_y")

        if any(val is None for val in [slot_id, width, height, top_left_x, top_left_y]):
            print(f"Warning: Slot ID {slot_id if slot_id else 'Unknown'} has missing configuration data. Skipping.")
            continue

        product_image_path = f"images/{slot_id}.png"

        if os.path.exists(product_image_path):
            try:
                product_image = Image.open(product_image_path)
                # Resize the product image
                product_image_resized = product_image.resize((int(width), int(height)))
                # Paste the resized product image
                working_image.paste(product_image_resized, (int(top_left_x), int(top_left_y)), product_image_resized if product_image_resized.mode == 'RGBA' else None)
            except FileNotFoundError: # Should be caught by os.path.exists, but as a safeguard
                print(f"Warning: Product image {product_image_path} not found. Skipping slot {slot_id}.")
            except Exception as e:
                print(f"Error processing product image {product_image_path} for slot {slot_id}: {e}")
        else:
            print(f"Warning: Product image {product_image_path} not found. Skipping slot {slot_id}.")

    # Save the Result
    output_image_path = "images/s65lfts_with_products.png"
    try:
        working_image.save(output_image_path)
        print(f"Successfully overlaid products. Output saved to {output_image_path}")
    except Exception as e:
        print(f"Error saving output image to {output_image_path}: {e}")

if __name__ == "__main__":
    overlay_products()
