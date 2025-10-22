import numpy as np
import pandas as pd
from sklearn import linear_model
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import pickle

# --------------------------
#  MODEL 1: BATELEC
# --------------------------
df_batelec = pd.read_csv('batelec_bill.csv')
print("BATELEC Data Count:\n", df_batelec.count())

# Features and target
X_batelec = df_batelec[['Total KWH Used', 'Electricity Rate']].values
Y_batelec = df_batelec['Consumption Price'].values

# Split
X_train_b, X_test_b, Y_train_b, Y_test_b = train_test_split(
    X_batelec, Y_batelec, test_size=0.1, random_state=0
)

# Train model
model_batelec = linear_model.LinearRegression()
model_batelec.fit(X_train_b, Y_train_b)

# Evaluate
Y_pred_b = model_batelec.predict(X_test_b)
print("\n⚡ BATELEC MODEL RESULTS ⚡")
print("R² Score:", r2_score(Y_test_b, Y_pred_b))
print("MSE:", mean_squared_error(Y_test_b, Y_pred_b))

# Save model
pickle.dump(model_batelec, open('model_batelec.pkl', 'wb'))


# --------------------------
#  MODEL 2: MERALCO
# --------------------------
df_meralco = pd.read_csv('meralco_bill.csv')
print("\nMERALCO Data Count:\n", df_meralco.count())

# Features and target
X_meralco = df_meralco[['Total KWH Used', 'Electricity Rate']].values
Y_meralco = df_meralco['Consumption Price'].values

# Split
X_train_m, X_test_m, Y_train_m, Y_test_m = train_test_split(
    X_meralco, Y_meralco, test_size=0.51, random_state=0
)

# Train model
model_meralco = linear_model.LinearRegression()
model_meralco.fit(X_train_m, Y_train_m)

# Evaluate
Y_pred_m = model_meralco.predict(X_test_m)
print("\n💡 MERALCO MODEL RESULTS 💡")
print("R² Score:", r2_score(Y_test_m, Y_pred_m))
print("MSE:", mean_squared_error(Y_test_m, Y_pred_m))

# Save model
pickle.dump(model_meralco, open('model_meralco.pkl', 'wb'))
