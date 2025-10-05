from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle

app = Flask(__name__)
CORS(app)

# Load model
model = None
try:
    with open('model.pkl', 'rb') as file:
        model = pickle.load(file)
    print("✅ Model loaded successfully!")
except:
    print("❌ Model not found!")

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'API is running', 'model_loaded': model is not None})

@app.route('/predict-price', methods=['POST'])
def predict_price():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 400

        data = request.json
        
        # Get inputs
        lot_no = float(data.get('lot_no', 0))
        area = float(data.get('area', 0))
        age = float(data.get('age', 0))
        distance = float(data.get('distance', 0))
        
        # Make prediction
        features = np.array([[lot_no, area, age, distance]])
        predicted_price = model.predict(features)[0]
        
        return jsonify({
            'predicted_price': float(predicted_price),
            'status': 'success'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("🚀 Starting API...")
    print(f"Model loaded: {model is not None}")
    app.run(debug=True, host='0.0.0.0', port=5000)