import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
import io
import base64
from PIL import Image, ImageChops, ImageEnhance
import tensorflow as tf
import shap
import os
from flask_cors import CORS
import matplotlib
matplotlib.use('Agg')  # Fix GUI error in Flask
from fpdf import FPDF  # PDF generation
import matplotlib.pyplot as plt
from fpdf import FPDF
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://127.0.0.1:5500", "http://localhost:5500"],
                              "methods": ["GET", "POST"],
                              "allow_headers": ["Content-Type", "Authorization"]}})


# Load the model
model_dir = os.path.join(os.getcwd(), 'model')
model_filename = "TampDetection-O-B4-10000-128.keras"
model_path = os.path.join(model_dir, model_filename)

try:
    model = tf.keras.models.load_model(model_path)
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {str(e)}")
    model = None

def convert_to_ela_image(image, quality=90):
    """Convert an image to ELA format."""
    temp = io.BytesIO()
    image.save(temp, format='JPEG', quality=quality)
    temp.seek(0)
    temp_img = Image.open(temp)
    ela_img = ImageChops.difference(image, temp_img)
    
    extrema = ela_img.getextrema()
    max_diff = max([ex[1] for ex in extrema])
    scale = 255.0 / max_diff if max_diff != 0 else 1
    return ImageEnhance.Brightness(ela_img).enhance(scale)

def prepare_image(image):
    """Prepare image for model input."""
    ela_img = convert_to_ela_image(image)
    ela_img = ela_img.resize((128, 128))
    img_array = np.array(ela_img).astype(np.float32) / 255.0
    return img_array.reshape(1, 128, 128, 3)

def generate_shap(model, img_array, background_size=(128, 128, 3)):
    """
    Computes SHAP heatmap for a given image and model.
    
    Parameters:
        model: Trained model to explain.
        img_array: Input image as a NumPy array.
        background_size: Tuple specifying background data shape.
    
    Returns:
        SHAP heatmap as a NumPy array.
    """
    # Create background data
    background_data = np.zeros(background_size, dtype=np.uint8)
    explainer = shap.GradientExplainer(model, background_data)
    
    # Compute SHAP values
    shap_values = explainer.shap_values(img_array)
    
    # Normalize SHAP values
    shap_values = np.array(shap_values) / (np.max(np.abs(shap_values)) + 1e-8)  # Avoid zero division
    shap_values = np.abs(shap_values) ** 0.5  # Enhance contrast
    shap_values = shap_values / np.max(shap_values)  # Scale to [0, 1]
    
    # Resize SHAP values to match image dimensions
    shap_heatmap = cv2.resize(shap_values[0].sum(axis=-1), (background_size[0], background_size[1]))
    
    return shap_heatmap

def refine_shap_heatmap(shap_heatmap):
    """Enhance SHAP heatmap without excessive smoothing."""
    norm_heatmap = cv2.normalize(shap_heatmap, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Reduce Gaussian blur intensity
    blurred = cv2.GaussianBlur(norm_heatmap, (3, 3), 0)  # Smaller kernel

    # Adaptive thresholding with finer control
    threshold_value = np.percentile(blurred, 90)  # Increase percentile for stronger highlights
    _, binary_mask = cv2.threshold(blurred, threshold_value, 255, cv2.THRESH_BINARY)

    return binary_mask



def overlay_shap_heatmap(original_image, shap_heatmap, alpha=0.7):
    """Overlay refined SHAP heatmap on the original image for distinct visibility."""
    refined_mask = cv2.resize(shap_heatmap, (original_image.width, original_image.height))

    # Use JET colormap for better contrast
    heatmap_color = cv2.applyColorMap(refined_mask, cv2.COLORMAP_JET)

    # Convert original image to OpenCV format
    original_cv = cv2.cvtColor(np.array(original_image), cv2.COLOR_RGB2BGR)

    # Increase SHAP overlay visibility with higher alpha
    overlay = cv2.addWeighted(original_cv, 0.5, heatmap_color, alpha, 0)

    return Image.fromarray(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))

def generate_legend():
    """Generate a color legend for the SHAP heatmap with descriptive labels."""
    fig, ax = plt.subplots(figsize=(6, 1))
    cmap = plt.get_cmap("jet")  # Use the same colormap as SHAP overlay
    norm = plt.Normalize(vmin=0, vmax=1)  # Normalize the scale
    
    # Create colorbar
    cbar = fig.colorbar(plt.cm.ScalarMappable(norm=norm, cmap=cmap), 
                        cax=ax, orientation='horizontal')
    cbar.set_label("SHAP Impact Level", fontsize=12)

    # ✅ Set precise tick positions
    cbar.set_ticks([0, 0.33, 0.66, 1])
    
    # ✅ Add detailed text labels for each impact level
    cbar.set_ticklabels([
        "Low Impact \n(Blue)",
        "Medium Impact \n(Green-Yellow)",
        "High Impact \n(Orange-Red)",
        "Very High Impact \n(Bright Red)"
    ])

    # Save to BytesIO buffer
    buf = io.BytesIO()
    plt.savefig(buf, format="PNG", bbox_inches="tight")
    plt.close(fig)
    
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")  # Return base64

def image_to_base64(image):
    """Convert PIL image to base64."""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

@app.route("/predict", methods=["POST"])
def predict():
    """Handle image upload and return results."""
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    try:
        image = Image.open(file).convert('RGB')
        img_array = prepare_image(image)
        img_array = img_array.reshape(-1, 128, 128, 3)
        prediction = model.predict(img_array)
        predicted_class = np.argmax(prediction)

        softmax_probs = np.exp(prediction[0]) / np.sum(np.exp(prediction[0]))  # Apply softmax
        confidence = float(softmax_probs[predicted_class] * 100)  # Convert to percentage
        #confidence = float(prediction[0][predicted_class]) * 100  # Convert to percentage
        label = "Tampered" if predicted_class == 1 else "Real"

        # Generate SHAP explanation
        shap_map = generate_shap(model, img_array)

        # Modify SHAP map based on classification
        if predicted_class == 0:  # If classified as "Real"
            refined_shap_map = refine_shap_heatmap(shap_map)
            refined_shap_map = cv2.multiply(refined_shap_map, 0.2)  # Reduce influence (darker)
        else:  # If classified as "Tampered"
            refined_shap_map = refine_shap_heatmap(shap_map)  # Use original processing

        # Overlay SHAP explanation on the image
        highlighted_image = overlay_shap_heatmap(image, refined_shap_map)
        highlighted_img_base64 = image_to_base64(highlighted_image)


         # Generate the SHAP color legend
        legend_base64 = generate_legend()

        # Explanation messages
        if predicted_class == 1:
            explanation = (
                f"The model predicts this image as **TAMPERED** with {confidence:.2f}% confidence. "
                "The highlighted regions in the SHAP explanation show areas that had the most impact on the model's decision. "
                "Brighter regions indicate areas that influenced the model more."
            )
        else:
            explanation = (
                f"The model predicts this image as **REAL** with {confidence:.2f}% confidence. "
                "Since this image is real, only minimal influence regions are shown."
            )

        return jsonify({
            "label": label,
            "confidence": confidence,
            "explanation": explanation,
            "highlighted_img": highlighted_img_base64,
            "legend_img": legend_base64
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download_report", methods=["POST"])
def download_report():
    try:
        data = request.get_json()
        label = data.get("label", "Unknown")
        confidence = data.get("confidence", 0.0)
        highlighted_img_base64 = data.get("highlighted_img", "")

        print("Generating PDF report...")  # Debugging

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Arial", "B", 16)
        pdf.cell(200, 10, "Tampering Detection Report", ln=True, align="C")
        pdf.ln(10)

        pdf.set_font("Arial", "", 12)
        pdf.cell(0, 10, f"Result: {label}", ln=True)
        pdf.cell(0, 10, f"Confidence: {confidence:.2f}%", ln=True)
        pdf.ln(5)

        # Debugging: Check if image data is received
        print(f"Received base64 image length: {len(highlighted_img_base64)}")

        # Handle Image
        if highlighted_img_base64:
            import tempfile
            img_data = base64.b64decode(highlighted_img_base64)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_file:
                tmp_file.write(img_data)
                img_path = tmp_file.name  # Get the temp file path
            print(f"Image saved at: {img_path}")

            pdf.image(img_path, x=10, y=None, w=180)  # Add to PDF

        # 🔹 Correctly write PDF to BytesIO
        pdf_output = io.BytesIO()
        pdf_bytes = pdf.output(dest="S").encode("latin1")  # Convert to bytes
        pdf_output.write(pdf_bytes)
        pdf_output.seek(0)

        print("PDF generated successfully!")  # Debugging

        return send_file(pdf_output, as_attachment=True, download_name="Tampering_Report.pdf", mimetype="application/pdf")

    except Exception as e:
        print(f"Error generating report: {str(e)}")  # Debugging
        return jsonify({"error": str(e)}), 500

@app.route("/test", methods=["GET"])
def test():
    """Test endpoint to check if server is running."""
    return jsonify({"message": "Server is running"}), 200

if __name__ == "__main__":
    app.run(debug=True)