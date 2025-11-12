import numpy as np
import pickle

# --------------------------
# LOAD TRAINED MODELS
# --------------------------
try:
    model_batelec = pickle.load(open('model_batelec.pkl', 'rb'))
    model_meralco = pickle.load(open('model_meralco.pkl', 'rb'))
    print("✅ Models loaded successfully!")
except FileNotFoundError:
    print("❌ Model files not found! Please train the models first (run train_models.py).")
    exit()

# --------------------------
# MANUAL TESTING INTERFACE
# --------------------------
print("\n🔍 MANUAL MODEL TESTING 🔍")

while True:
    choice = input("\nWhich model do you want to test? (1 = BATELEC, 2 = MERALCO, q = quit): ").strip().lower()
    
    if choice == 'q':
        print("Exiting manual testing. ✅")
        break

    if choice not in ['1', '2']:
        print("⚠️ Invalid choice. Please enter 1, 2, or q.")
        continue

    try:
        total_kwh = float(input("Enter Total KWH Used: "))
        rate = float(input("Enter Electricity Rate: "))
    except ValueError:
        print("⚠️ Invalid input! Please enter numeric values.")
        continue

    X_manual = np.array([[total_kwh, rate]])

    if choice == '1':
        prediction = model_batelec.predict(X_manual)[0]
        print(f"⚡ Predicted BATELEC Consumption Price: ₱{prediction:,.2f}")
    else:
        prediction = model_meralco.predict(X_manual)[0]
        print(f"💡 Predicted MERALCO Consumption Price: ₱{prediction:,.2f}")
