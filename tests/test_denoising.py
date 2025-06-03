import unittest
import cv2
import numpy as np
import os
import shutil
from denoise_app.denoising import denoise_image

class TestDenoising(unittest.TestCase):

    def setUp(self):
        self.test_uploads_dir = "test_temp_uploads"
        self.test_denoised_dir = "test_temp_denoised"
        os.makedirs(self.test_uploads_dir, exist_ok=True)
        os.makedirs(self.test_denoised_dir, exist_ok=True)

        # Create a dummy noisy image
        self.dummy_image_name = "noisy_image.png"
        self.dummy_image_path = os.path.join(self.test_uploads_dir, self.dummy_image_name)

        # Create a simple image (e.g., 100x100 with random noise)
        height, width = 100, 100
        noisy_data = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
        cv2.imwrite(self.dummy_image_path, noisy_data)

        # Create a non-image file for testing invalid image scenario
        self.invalid_file_name = "invalid_file.txt"
        self.invalid_file_path = os.path.join(self.test_uploads_dir, self.invalid_file_name)
        with open(self.invalid_file_path, "w") as f:
            f.write("This is not an image.")

    def tearDown(self):
        if os.path.exists(self.test_uploads_dir):
            shutil.rmtree(self.test_uploads_dir)
        if os.path.exists(self.test_denoised_dir):
            shutil.rmtree(self.test_denoised_dir)

    def test_denoise_image_success(self):
        denoised_path = denoise_image(self.dummy_image_path, self.test_denoised_dir)

        self.assertIsNotNone(denoised_path, "Denoising function returned None for a valid image.")
        self.assertTrue(os.path.exists(denoised_path), "Denoised image file does not exist.")

        denoised_img = cv2.imread(denoised_path)
        self.assertIsNotNone(denoised_img, "Denoised image could not be read by OpenCV.")
        self.assertTrue(denoised_img.size > 0, "Denoised image is empty.")

        original_img = cv2.imread(self.dummy_image_path)
        self.assertEqual(original_img.shape, denoised_img.shape, "Original and denoised images have different dimensions.")

    def test_denoise_image_file_not_found(self):
        non_existent_path = os.path.join(self.test_uploads_dir, "non_existent_image.png")
        result = denoise_image(non_existent_path, self.test_denoised_dir)
        self.assertIsNone(result, "Denoising function did not return None for a non-existent file.")

    def test_denoise_image_invalid_image(self):
        result = denoise_image(self.invalid_file_path, self.test_denoised_dir)
        self.assertIsNone(result, "Denoising function did not return None for an invalid image file.")

if __name__ == '__main__':
    unittest.main()
