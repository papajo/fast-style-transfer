import unittest
import os
import shutil
import tempfile
from denoise_app.app import app # Import the Flask app instance
from io import BytesIO # For creating dummy file uploads

class TestWebApp(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

        # Create temporary folders for uploads and denoised images for the app context
        self.temp_upload_dir = tempfile.mkdtemp()
        self.temp_denoised_dir = tempfile.mkdtemp()

        app.config['UPLOAD_FOLDER'] = self.temp_upload_dir
        app.config['DENOISED_FOLDER'] = self.temp_denoised_dir

        # Ensure these directories exist for the app during tests
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(app.config['DENOISED_FOLDER'], exist_ok=True)

        # Create a dummy image file for upload testing
        self.dummy_image_name = "test_image.png"
        self.dummy_image_path = os.path.join(self.temp_upload_dir, self.dummy_image_name)

        # Create a simple PNG file (1x1 pixel)
        try:
            from PIL import Image
            img = Image.new('RGB', (1, 1), color = 'red')
            img.save(self.dummy_image_path, "PNG")
            self.pil_available = True
        except ImportError:
            self.pil_available = False
            # Fallback: create a dummy text file if PIL is not available,
            # and skip tests that require actual image processing by the app.
            # For a real scenario, ensure PIL or OpenCV is in test requirements.
            with open(self.dummy_image_path, "wb") as f: # Write as bytes
                f.write(b"dummy png content")
            print("Warning: PIL not found. Upload test will use a dummy file. Some checks might be lenient.")


    def tearDown(self):
        if os.path.exists(self.temp_upload_dir):
            shutil.rmtree(self.temp_upload_dir)
        if os.path.exists(self.temp_denoised_dir):
            shutil.rmtree(self.temp_denoised_dir)

    def test_index_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Image Denoising App", response.data)
        self.assertIn(b"Upload and Denoise", response.data)

    def test_upload_no_file(self):
        response = self.client.post('/upload', data={})
        self.assertEqual(response.status_code, 302) # Expecting a redirect
        self.assertIn(b'/', response.location.encode()) # Check if redirects to index

    def test_upload_and_denoise_success(self):
        if not self.pil_available and not os.path.exists(self.dummy_image_path):
             self.skipTest("PIL not available and dummy image creation failed, skipping upload success test.")

        # If you want to truly mock denoise_image, you would use unittest.mock.patch
        # from unittest.mock import patch
        # @patch('denoise_app.app.denoise_image')
        # def test_upload_and_denoise_success(self, mock_denoise_image):
        #    mock_denoise_image.return_value = os.path.join(app.config['DENOISED_FOLDER'], "denoised_test_image.png")
        # Create a dummy denoised file as if denoise_image function created it
        #    if not os.path.exists(os.path.join(app.config['DENOISED_FOLDER'], "denoised_test_image.png")):
        #       with open(os.path.join(app.config['DENOISED_FOLDER'], "denoised_test_image.png"), "w") as f:
        #            f.write("dummy denoised content")

        data = {}
        try:
            with open(self.dummy_image_path, 'rb') as img_file:
                data['image'] = (BytesIO(img_file.read()), self.dummy_image_name)
        except FileNotFoundError:
             self.skipTest(f"Dummy image {self.dummy_image_path} not found, skipping upload success test.")

        if not data: # If file could not be opened
            self.skipTest("Dummy image could not be prepared for upload.")

        response = self.client.post('/upload', data=data, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 200, f"Upload failed with status {response.status_code}. Response data: {response.data.decode()}")
        self.assertIn(b"Original Image", response.data)
        self.assertIn(b"Denoised Image", response.data)

        # Check if uploaded file exists
        uploaded_files = os.listdir(app.config['UPLOAD_FOLDER'])
        self.assertTrue(any(f.startswith(self.dummy_image_name.split('.')[0]) for f in uploaded_files), "Uploaded file not found in upload folder.")

        # Check if denoised file exists (name will be like 'denoised_test_image.png')
        denoised_files = os.listdir(app.config['DENOISED_FOLDER'])
        self.assertTrue(any(f.startswith("denoised_") for f in denoised_files), "Denoised file not found in denoised folder.")


    def test_serve_uploaded_file(self):
        # Ensure there's a file to serve
        test_serve_filename = "serve_me.txt"
        with open(os.path.join(app.config['UPLOAD_FOLDER'], test_serve_filename), 'w') as f:
            f.write("Test content for serving.")

        response = self.client.get(f'/uploads/{test_serve_filename}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b"Test content for serving.")

    def test_serve_denoised_file(self):
        # Ensure there's a file to serve
        test_serve_filename = "denoised_serve_me.txt"
        with open(os.path.join(app.config['DENOISED_FOLDER'], test_serve_filename), 'w') as f:
            f.write("Test denoised content for serving.")

        response = self.client.get(f'/denoised/{test_serve_filename}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b"Test denoised content for serving.")


if __name__ == '__main__':
    unittest.main()
