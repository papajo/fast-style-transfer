import os
from flask import Flask, request, render_template, redirect, url_for, send_from_directory
from werkzeug.utils import secure_filename
from denoising import denoise_image # Assuming denoising.py is in the same directory

app = Flask(__name__)

# Configure upload and denoised folders
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
DENOISED_FOLDER = os.path.join(APP_ROOT, 'denoised')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DENOISED_FOLDER'] = DENOISED_FOLDER

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DENOISED_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return redirect(request.url) # Should be redirect('/') or url_for('index')

    file = request.files['image']
    if file.filename == '':
        return redirect(request.url) # Should be redirect('/') or url_for('index')

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uploaded_image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(uploaded_image_path)

        denoised_image_output_path = denoise_image(uploaded_image_path, app.config['DENOISED_FOLDER'])

        if denoised_image_output_path:
            denoised_filename = os.path.basename(denoised_image_output_path)
            original_image_url = url_for('serve_uploaded_file', filename=filename)
            denoised_image_url = url_for('serve_denoised_file', filename=denoised_filename)
            return render_template('result.html', original_image_url=original_image_url, denoised_image_url=denoised_image_url)
        else:
            # Handle denoising failure, e.g., redirect to index or show an error
            return redirect(url_for('index')) # Or a specific error page

    return redirect(url_for('index')) # If file type not allowed or other issues

@app.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/denoised/<filename>')
def serve_denoised_file(filename):
    return send_from_directory(app.config['DENOISED_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)
