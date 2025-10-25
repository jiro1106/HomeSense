from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
from datetime import datetime
import pandas as pd

# Create Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from React Native

# --------------------------
# Load both trained models
# --------------------------
models = {}

def load_model(name, filename):
    try:
        with open(filename, 'rb') as file:
            models[name] = pickle.load(file)
        print(f"✅ {name.upper()} model loaded successfully from {filename}")
    except FileNotFoundError:
        print(f"⚠️ {filename} not found. Run model.py first to train the {name} model.")
    except Exception as e:
        print(f"❌ Error loading {name} model: {e}")

load_model('batelec', 'model_batelec.pkl')
load_model('meralco', 'model_meralco.pkl')

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Electric Bill Prediction API is running!',
        'models_loaded': list(models.keys()),
        'status': 'success',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Electric Bill Prediction API',
        'models': {name: 'loaded' for name in models.keys()}
    })

# --------------------------
# Predict endpoint
# --------------------------
@app.route('/predict-bill', methods=['POST'])
def predict_bill():
    try:
        data = request.json
        
        company = data.get('company', '').lower()
        if company not in models:
            return jsonify({
                'error': f"Invalid company. Choose from {list(models.keys())}",
                'status': 'failed'
            }), 400

        model = models[company]

        # Extract features
        total_kwh = data.get('total_kwh', 0)
        rate = data.get('rate', 0)

        # Validate
        if total_kwh <= 0 or rate <= 0:
            return jsonify({
                'error': 'Both total_kwh and rate must be greater than 0',
                'status': 'failed'
            }), 400

        # Prepare input
        features = np.array([[total_kwh, rate]])

        # Predict
        predicted_price = model.predict(features)[0]

        return jsonify({
            'company': company.title(),
            'predicted_consumption_price': round(predicted_price, 2),
            'input_features': {
                'Total KWH Used': total_kwh,
                'Electricity Rate': rate
            },
            'currency': 'PHP',
            'model_type': 'Linear Regression',
            'status': 'success'
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'failed'
        }), 400


# --------------------------
# Rate endpoint (derive from CSV)
# --------------------------
@app.route('/rate', methods=['GET'])
def get_rate():
    try:
        company = request.args.get('company', '').lower()
        method = request.args.get('method', 'latest').lower()  # 'latest' or 'mean'
        if company not in ['batelec', 'meralco']:
            return jsonify({'error': 'Invalid company. Use batelec or meralco', 'status': 'failed'}), 400

        filename = 'batelec_bill.csv' if company == 'batelec' else 'meralco_bill.csv'
        if not os.path.exists(filename):
            return jsonify({'error': f'{filename} not found', 'status': 'failed'}), 400

        df = pd.read_csv(filename)
        if 'Electricity Rate' not in df.columns or len(df) == 0:
            return jsonify({'error': 'Rate column missing or empty dataset', 'status': 'failed'}), 400

        if method == 'mean':
            rate = float(df['Electricity Rate'].astype(float).mean())
        else:
            # latest = last non-null row's rate
            rate_series = df['Electricity Rate'].dropna().astype(float)
            rate = float(rate_series.iloc[-1]) if len(rate_series) > 0 else float(df['Electricity Rate'].astype(float).mean())

        return jsonify({
            'company': company.title(),
            'rate': round(rate, 6),
            'method': method,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'failed'}), 400


# --------------------------
# Model info endpoint
# --------------------------
@app.route('/model-info', methods=['GET'])
def model_info():
    if not models:
        return jsonify({
            'error': 'No models loaded',
            'status': 'failed'
        }), 400
    
    return jsonify({
        'available_models': list(models.keys()),
        'features': ['Total KWH Used', 'Electricity Rate'],
        'target': 'Consumption Price',
        'status': 'success'
    })


# --------------------------
# Run server
# --------------------------
if __name__ == '__main__':
    print("🚀 Starting Electric Bill Prediction API...")
    if models:
        print(f"🧠 Loaded models: {', '.join(models.keys())}")
    else:
        print("⚠️ No models loaded. Run your model.py first!")
    print("🔗 API running at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
