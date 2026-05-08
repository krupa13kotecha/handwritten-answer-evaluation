import sys
import pytesseract
from PIL import Image, UnidentifiedImageError

def extract_text(image_path):
    # Use pytesseract to do OCR on the image
    try:
        # Load the image and convert it to grayscale (optional, improves accuracy)
        image = Image.open(image_path).convert('L')
        
        # Perform OCR using pytesseract
        text = pytesseract.image_to_string(image)
        
        # Return the extracted text after stripping leading/trailing whitespace
        return text
    
    except UnidentifiedImageError:
        return f"Error: Unable to open the image file '{image_path}'. Please check the file format."
    
    except Exception as e:
        return f"Error during OCR: {str(e)}"

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python crnn_simulator.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    extracted_text = extract_text(image_path)
    print(extracted_text)
