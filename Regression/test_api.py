import requests

# Test single house prediction
url = "http://localhost:5000/predict-price"
test_house = {
    "lot_no": 1,
    "area": 150,  # square meters
    "age": 5,     # years old
    "distance": 2 # km to city center
}

response = requests.post(url, json=test_house)
print("Single house prediction:", response.json())

# Test batch prediction
batch_url = "http://localhost:5000/predict-batch"
test_data = {
    "houses": [
        {"lot_no": 1, "area": 120, "age": 3, "distance": 1.5},
        {"lot_no": 2, "area": 200, "age": 10, "distance": 3.0},
        {"lot_no": 3, "area": 80, "age": 1, "distance": 0.5}
    ]
}

batch_response = requests.post(batch_url, json=test_data)
print("Batch prediction:", batch_response.json())