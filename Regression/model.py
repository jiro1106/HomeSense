import numpy as np
import pandas as pd
from sklearn import linear_model
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

# Train model on full dataset
model_batelec = linear_model.LinearRegression()
model_batelec.fit(X_batelec, Y_batelec)

# Evaluate on the same dataset
Y_pred_b = model_batelec.predict(X_batelec)
print("\n⚡ BATELEC MODEL RESULTS ⚡")
print("R² Score:", r2_score(Y_batelec, Y_pred_b))
print("MSE:", mean_squared_error(Y_batelec, Y_pred_b))

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

# Train model on full dataset
model_meralco = linear_model.LinearRegression()
model_meralco.fit(X_meralco, Y_meralco)

# Evaluate on the same dataset
Y_pred_m = model_meralco.predict(X_meralco)
print("\n💡 MERALCO MODEL RESULTS 💡")
print("R² Score:", r2_score(Y_meralco, Y_pred_m))
print("MSE:", mean_squared_error(Y_meralco, Y_pred_m))

# Save model
pickle.dump(model_meralco, open('model_meralco.pkl', 'wb'))
