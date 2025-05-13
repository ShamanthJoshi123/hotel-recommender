from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

def load_data():
    # Load dataset
    df = pd.read_csv('oyo_hotel_rooms.csv')

    # Clean and convert Discount column
    if 'Discount' in df.columns:
        df['Discount'] = df['Discount'].astype(str).str.replace('%', '', regex=False)
        df['Discount'] = pd.to_numeric(df['Discount'], errors='coerce')

    # Clean and convert Price column
    if 'Price' in df.columns:
        df['Price'] = df['Price'].astype(str).str.replace('₹', '', regex=False)
        df['Price'] = df['Price'].str.replace(',', '', regex=False)
        df['Price'] = pd.to_numeric(df['Price'], errors='coerce')

    # Clean and convert Rating column
    if 'Rating' in df.columns:
        df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')

    # Drop rows with missing values in relevant columns
    df = df[['Hotel_name', 'Location', 'Price', 'Discount', 'Rating']].dropna()
    df = df.drop_duplicates()

    # Prepare features for KNN (only Price and Rating)
    features = df[['Price', 'Rating']].values
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # Train KNN model
    knn = NearestNeighbors(n_neighbors=5, metric='euclidean')
    knn.fit(features_scaled)

    return df, scaler, knn

df, scaler, model = load_data()

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    user_input = [[float(data['price']), float(data['rating'])]]
    user_input_scaled = scaler.transform(user_input)
    distances, indices = model.kneighbors(user_input_scaled)

    results = []
    for idx in indices[0]:
        hotel = df.iloc[idx]
        results.append({
            'Hotel_name': str(hotel['Hotel_name']),
            'Location': str(hotel['Location']),
            'Price': float(hotel['Price']),
            'Discount': float(hotel['Discount']),
            'Rating': float(hotel['Rating'])
        })
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
