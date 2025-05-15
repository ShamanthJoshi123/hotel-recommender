from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, LabelEncoder

app = Flask(__name__)
CORS(app)

def extract_city(location):
    if pd.isna(location):
        return ''
    parts = str(location).split(',')
    return parts[-1].strip() if len(parts) > 1 else parts[0].strip()

def load_data():
    df = pd.read_csv('oyo_hotel_rooms.csv')

    # Clean Price
    df['Price'] = df['Price'].astype(str).str.replace('₹', '', regex=False).str.replace(',', '', regex=False)
    df['Price'] = pd.to_numeric(df['Price'], errors='coerce')

    # Clean Discount
    df['Discount'] = df['Discount'].astype(str).str.replace('%', '', regex=False)
    df['Discount'] = pd.to_numeric(df['Discount'], errors='coerce')

    # Treat Rating as number of Reviews
    df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce')

    # Drop rows with missing critical info
    df = df[['Hotel_name', 'Location', 'Price', 'Discount', 'Rating']].dropna().drop_duplicates()

    # Extract city
    df['City'] = df['Location'].apply(extract_city)

    # Drop rows with empty cities
    df = df[df['City'].str.strip() != '']

    # Encode city
    label_encoder = LabelEncoder()
    df['City_encoded'] = label_encoder.fit_transform(df['City'])

    # Prepare features
    features = df[['City_encoded', 'Price', 'Discount', 'Rating']]
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    knn = NearestNeighbors(n_neighbors=5, metric='euclidean')
    knn.fit(features_scaled)

    return df.reset_index(drop=True), scaler, knn, label_encoder

df, scaler, model, label_encoder = load_data()

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    city = data.get('city')
    price = float(data.get('price', 0))
    discount = float(data.get('discount', 0))
    rating = float(data.get('rating', 0))

    try:
        city_encoded = label_encoder.transform([city])[0]
    except ValueError:
        return jsonify({"error": f"City '{city}' not found in dataset"}), 400

    user_input = [[city_encoded, price, discount, rating]]
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
            'Rating': int(hotel['Rating'])  # Treating as review count
        })

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)