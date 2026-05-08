import sys
import json
from sentence_transformers import SentenceTransformer, util

def calculate_similarity(extracted_text, reference_text):
    try:
        # Load a pre-trained BERT model for text similarity
        model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

        # Encode both OCR-extracted text and the predefined reference text into embeddings
        ocr_embedding = model.encode(extracted_text, convert_to_tensor=True)
        reference_embedding = model.encode(reference_text, convert_to_tensor=True)

        # Calculate cosine similarity between the two texts using the BERT embeddings
        similarity_score = util.pytorch_cos_sim(ocr_embedding, reference_embedding).item()

        # Allocate marks based on similarity score
        max_marks = 10  # Define the maximum possible marks
        allocated_marks = similarity_score * max_marks

        return similarity_score, allocated_marks

    except Exception as e:
        print(f"Error during similarity calculation: {str(e)}", file=sys.stderr)
        return None, 0

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python similarity_calculator.py <extracted_text> <reference_text>")
        sys.exit(1)

    extracted_text = sys.argv[1]
    reference_text = sys.argv[2]

    similarity_score, allocated_marks = calculate_similarity(extracted_text, reference_text)

    if similarity_score is not None:
        # Output the results as JSON
        result = {
            'similarityScore': round(similarity_score, 4),
            'allocatedMarks': round(allocated_marks, 2)
        }
        print(json.dumps(result, indent=4))
    else:
        print(json.dumps({'error': 'Failed to calculate similarity'}, indent=4))
