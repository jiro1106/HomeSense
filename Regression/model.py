import numpy as np
import pandas as pd
from sklearn import linear_model
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import pickle

df=pd.read_csv('housepricey.csv')
print(df.count())

df_train=df
X=df_train[['Lot No.','Area','Age','Distance']].values.reshape(-1,4)
Y=df_train['Price'].values

print(X)
print(Y)

X_train, X_test, Y_train, Y_test= train_test_split(X, Y, test_size=0.3, random_state=0)

model=linear_model.LinearRegression()
model.fit(X_train,Y_train)

Y_pred=model.predict(X_test)

print(r2_score(Y_test,Y_pred))
print(mean_squared_error(Y_test,Y_pred))

pickle.dump(model, open('model.pkl',"wb"))