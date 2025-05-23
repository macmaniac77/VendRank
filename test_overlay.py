import subprocess
import os
import sys

def run_test():
    """Runs the test for overlay_products.py."""
    print("INFO: Running test for overlay_products.py...")
    test_passed = True
    failure_reason = ""

    # Prerequisite Checks
    slot_config_path = "slot_config.json"
    base_image_path = "images/s65lfts.png"
    sample_product_image_path = "images/1.png" # Used to check if at least one product image is present

    if not os.path.exists(slot_config_path):
        print(f"ERROR: Prerequisite {slot_config_path} not found. Test cannot run.")
        sys.exit(1)

    if not os.path.exists(base_image_path):
        print(f"ERROR: Prerequisite {base_image_path} not found. Test cannot run.")
        sys.exit(1)

    if not os.path.exists(sample_product_image_path):
        print(f"WARNING: Sample product image {sample_product_image_path} not found. Test might not be fully representative, but continuing...")

    # Execute the script
    script_to_test = "overlay_products.py"
    try:
        result = subprocess.run(
            ['python', script_to_test],
            capture_output=True,
            text=True,
            check=False # Set to False to manually check returncode
        )

        if result.returncode != 0:
            test_passed = False
            failure_reason = f"{script_to_test} failed with return code {result.returncode}."
            print(f"ERROR: {script_to_test} execution failed.")
            if result.stdout:
                print("STDOUT:")
                print(result.stdout)
            if result.stderr:
                print("STDERR:")
                print(result.stderr)
        else:
            print(f"INFO: {script_to_test} executed successfully.")
            if result.stdout: # Print stdout even on success for more info
                print("STDOUT:")
                print(result.stdout)


    except FileNotFoundError:
        test_passed = False
        failure_reason = f"Script {script_to_test} not found."
        print(f"ERROR: {failure_reason}")
    except Exception as e:
        test_passed = False
        failure_reason = f"An unexpected error occurred while trying to run {script_to_test}: {e}"
        print(f"ERROR: {failure_reason}")

    if not test_passed: # If script execution failed, no point checking for output
        print(f"FAILURE: Test failed. Reason: {failure_reason}")
        sys.exit(1)

    # Check for output file
    output_image_path = "images/s65lfts_with_products.png"
    if os.path.exists(output_image_path):
        print(f"INFO: Output file {output_image_path} found.")
        # Optional: Cleanup - decided against for now as per instructions
        # try:
        #     os.remove(output_image_path)
        #     print(f"INFO: Cleaned up {output_image_path}.")
        # except OSError as e:
        #     print(f"WARNING: Could not clean up {output_image_path}: {e}")
    else:
        test_passed = False
        failure_reason = f"Output file {output_image_path} was not created."
        print(f"ERROR: {failure_reason}")

    # Final Test Result
    if test_passed:
        print("SUCCESS: Test passed.")
        sys.exit(0)
    else:
        print(f"FAILURE: Test failed. Reason: {failure_reason}")
        sys.exit(1)

if __name__ == "__main__":
    run_test()
