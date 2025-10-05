import { Platform } from 'react-native';

type PredictPriceRequest = {
  lot_no: number;
  area: number;
  age: number;
  distance: number;
};

type PredictPriceResponse = {
  predicted_price: number;
  status: string;
};

export const API_BASE_URL = 'http:///192.168.0.199:5000';


export async function predictPrice(body: PredictPriceRequest): Promise<PredictPriceResponse> {
  const response = await fetch(`${API_BASE_URL}/predict-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  
  if (!response.ok) {
    throw new Error(json.error || 'Prediction failed');
  }
  
  return json;
}