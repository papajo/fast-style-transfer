import cv2
import os
import numpy as np

def denoise_image(input_image_path, output_directory):
    """
    Reads an image, applies a denoising algorithm, and saves the denoised image.

    Args:
        input_image_path (str): The path to the input image.
        output_directory (str): The directory to save the denoised image.

    Returns:
        str: The full path to the saved denoised image, or None if an error occurs.
    """
    if not os.path.exists(input_image_path):
        print(f"Error: Input image path does not exist: {input_image_path}")
        return None

    img = cv2.imread(input_image_path)
    if img is None:
        print(f"Error: Could not read image from path: {input_image_path}")
        return None

    try:
        denoised_img = cv2.fastNlMeansDenoisingColored(img, None, h=10, hColor=10, templateWindowSize=7, searchWindowSize=21)

        if not os.path.exists(output_directory):
            os.makedirs(output_directory)

        base_filename = os.path.basename(input_image_path)
        denoised_filename = f"denoised_{base_filename}"
        output_image_path = os.path.join(output_directory, denoised_filename)

        cv2.imwrite(output_image_path, denoised_img)
        return output_image_path

    except Exception as e:
        print(f"Error during denoising or saving image: {e}")
        return None

if __name__ == '__main__':
    # Create dummy files for testing
    # This part is for basic testing and might need adjustment based on project structure
    if not os.path.exists("test_images"):
        os.makedirs("test_images")
    if not os.path.exists("test_output"):
        os.makedirs("test_output")

    # Create a dummy image (e.g., a black square)
    dummy_image = np.zeros((100, 100, 3), dtype=np.uint8)
    dummy_input_path = "test_images/dummy_input.png"
    cv2.imwrite(dummy_input_path, dummy_image)

    print(f"Attempting to denoise: {dummy_input_path}")
    denoised_path = denoise_image(dummy_input_path, "test_output")

    if denoised_path:
        print(f"Denoised image saved to: {denoised_path}")
        # Clean up dummy files
        os.remove(dummy_input_path)
        os.remove(denoised_path)
        os.rmdir("test_images")
        os.rmdir("test_output")
    else:
        print("Denoising failed.")
        # Clean up dummy input if it exists
        if os.path.exists(dummy_input_path):
            os.remove(dummy_input_path)
        if os.path.exists("test_images"):
            os.rmdir("test_images")
        if os.path.exists("test_output"):
            os.rmdir("test_output")
