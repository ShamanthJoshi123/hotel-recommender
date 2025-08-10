from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import requests
import os
from dotenv import load_dotenv
import time
import csv
import random
import math
import glob

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Path to local OYO data CSV
OYO_CSV_PATH = 'OYO_HOTELS_792_transformed.csv'

CITY_CODES = {
    "agra": "AGR",
    "ahmedabad": "AMD",
    "ajmer": "AII",
    "allahabad": "IXD",
    "amritsar": "ATQ",
    "aurangabad": "IXU",
    "bengaluru": "BLR",
    "bangalore": "BLR",
    "bhopal": "BHO",
    "bhubaneswar": "BBI",
    "chandigarh": "IXC",
    "chennai": "MAA",
    "cochin": "COK",
    "coimbatore": "CJB",
    "delhi": "DEL",
    "goa": "GOA",
    "gurgaon": "DEL",
    "gwalior": "GWL",
    "hyderabad": "HYD",
    "imphal": "IMF",
    "indore": "IDR",
    "jaipur": "JAI",
    "jammu": "JAM",
    "jodhpur": "JDH",
    "kanpur": "KNP",
    "kochi": "COK",
    "kolkata": "CCU",
    "lucknow": "LKO",
    "ludhiana": "LUH",
    "madurai": "MDU",
    "mangalore": "IXE",
    "mumbai": "BOM",
    "nagpur": "NAG",
    "nashik": "ISK",
    "pune": "PNQ",
    "ranchi": "RAN",
    "shivamogga": "SMG",
    "surat": "STV",
    "thane": "BOM",
    "trenall": "TRZ",
    "tirupati": "TIR",
    "trivandrum": "TRV",
    "udupi": "UDU",
    "varanasi": "VNS",
    "vadodara": "BDQ",
    "vijayawada": "VJA",
    "visakhapatnam": "VTZ",
}

AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY")
AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET")

oyo_hotels_df = None


def load_oyo_hotels():
    global oyo_hotels_df
    if oyo_hotels_df is None:
        if not os.path.exists(OYO_CSV_PATH):
            raise FileNotFoundError(f"{OYO_CSV_PATH} not found.")
        print(f"Loading OYO dataset from {OYO_CSV_PATH}...")
        oyo_hotels_df = pd.read_csv(OYO_CSV_PATH)
        print(f"Loaded {len(oyo_hotels_df)} hotels from static dataset.")
    return oyo_hotels_df


def recursively_clean(obj):
    if isinstance(obj, dict):
        return {k: recursively_clean(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [recursively_clean(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj


def calculate_final_rating(raw_rating, property_type, hotel_name=None):
    popular_brands = [
        "taj", "oberoi", "leela", "ritz carlton", "conrad", "fairmont",
        "marriott", "hilton", "hyatt", "novotel", "holiday inn", "intercontinental",
        "crowne plaza", "westin", "jw marriott"
    ]
    try:
        rating = float(raw_rating)
        if 0 <= rating <= 5:
            base = rating
        else:
            base = None
    except Exception:
        base = None

    if base is None:
        prop_score_map = {
            'hotel': 4.0,
            'apartment': 3.5,
            'hostel': 2.5,
            'resort': 4.5,
            'villa': 4.0
        }
        base = prop_score_map.get((property_type or "").lower(), 3.0)

    boost = 0.0
    if hotel_name:
        name = hotel_name.lower()
        for brand in popular_brands:
            if brand in name:
                boost = 0.2
                break

    noise = random.uniform(-0.1, 0.1)
    final_rating = base + boost + noise
    final_rating = max(0, min(5, final_rating))
    return round(final_rating, 2)


def get_amadeus_access_token(api_key, api_secret):
    print("Requesting Amadeus access token...")
    url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    data = {'grant_type': 'client_credentials', 'client_id': api_key, 'client_secret': api_secret}
    resp = requests.post(url, data=data)
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise Exception("Failed to get Amadeus access token")
    print("Access token acquired")
    return token.strip()


def get_hotel_list(city_code, token):
    print(f"Fetching hotel list for city code: {city_code}")
    url = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"cityCode": city_code}
    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    hotels = data.get("data", [])
    print(f"Fetched {len(hotels)} hotels")
    return hotels


def get_hotel_offers_batch(hotel_ids, checkin, checkout, token, adults):
    print(f"Querying hotel offers batch size {len(hotel_ids)}")
    url = "https://test.api.amadeus.com/v3/shopping/hotel-offers"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "hotelIds": ",".join(hotel_ids),
        "adults": adults,
        "checkInDate": checkin,
        "checkOutDate": checkout,
    }
    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    print(f"Received {len(data.get('data', []))} offers")
    return data


def pick_hotels(all_hotels, sample_size=60):
    # Simply randomly sample up to sample_size hotels
    if len(all_hotels) <= sample_size:
        sampled = all_hotels.copy()
    else:
        sampled = random.sample(all_hotels, sample_size)
    print(f"Picked total {len(sampled)} hotels randomly")
    return sampled


def delete_old_csvs(city_code, current_checkin, current_checkout):
    """
    Delete cached CSV files for the same city but with different checkin/checkout.
    Preserve the CSV matching current checkin & checkout dates.
    """
    pattern = f'hotels_{city_code}_*.csv'
    csv_files = glob.glob(pattern)
    for file in csv_files:
        parts = file.rstrip('.csv').split('_')
        if len(parts) < 4:
            continue
        file_checkin = parts[-2]
        file_checkout = parts[-1]
        if file_checkin != current_checkin or file_checkout != current_checkout:
            try:
                os.remove(file)
                print(f"Deleted old CSV file: {file}")
            except Exception as e:
                print(f"Failed to delete {file}: {e}")


def recursively_clean(obj):
    if isinstance(obj, dict):
        return {k: recursively_clean(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [recursively_clean(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj


def fetch_and_cache_hotels(city, checkin_date, checkout_date, adults):
    city_code = CITY_CODES[city]
    token = get_amadeus_access_token(AMADEUS_API_KEY, AMADEUS_API_SECRET)
    hotels = get_hotel_list(city_code, token)
    if not hotels:
        raise Exception(f"No hotels found for city '{city}'.")
    
    # Pick 60 hotels randomly (updated to new pick_hotels)
    selected = pick_hotels(hotels, sample_size=60)
    hotel_ids = [h['hotelId'] for h in selected if 'hotelId' in h]

    batch_size = 20  # updated batch size from 30 to 20
    offers = []
    idx = 0
    max_ids = 60   # Safety cap just in case

    # Limit total IDs to 60 just in case
    hotel_ids = hotel_ids[:max_ids]

    while idx < len(hotel_ids):
        batch = hotel_ids[idx : idx + batch_size]
        data = get_hotel_offers_batch(batch, checkin_date, checkout_date, token, adults)
        offers.extend(data.get('data', []))
        idx += batch_size
        time.sleep(1.0)

    hotel_map = {h['hotelId']: h for h in hotels}
    merged = {}

    for o in offers:
        hid = o.get("hotel", {}).get("hotelId")
        if not hid:
            continue
        info_offer = o.get("hotel", {})
        info_list = hotel_map.get(hid, {})

        addr = info_offer.get("address", {}).get("lines", []) or info_list.get("address", {}).get("lines", []) or []
        lat = info_offer.get("geoCode", {}).get("latitude") or info_list.get("geoCode", {}).get("latitude")
        lng = info_offer.get("geoCode", {}).get("longitude") or info_list.get("geoCode", {}).get("longitude")
        prop_type = info_offer.get("type") or info_list.get("type")
        rating = info_offer.get("rating") or info_list.get("rating")

        if hid not in merged:
            merged[hid] = {
                "hotelId": hid,
                "Hotel_name": info_offer.get("name") or info_list.get("name", ""),
                "Address": " | ".join(addr),
                "Latitude": lat or '',
                "Longitude": lng or '',
                "Property_type": prop_type or '',
                "Room_status": "Available" if o.get("offers") else "Unavailable",
                "Price": None,
                "Currency": None,
                "Rating": rating or '',
                "Final_rating": None,
            }
        if merged[hid]["Price"] is None and o.get("offers"):
            price_info = o["offers"][0].get("price", {})
            merged[hid]["Price"] = price_info.get("total")
            merged[hid]["Currency"] = price_info.get("currency")

    hotel_list = list(merged.values())
    hotel_list = recursively_clean(hotel_list)
    for h in hotel_list:
        h["Final_rating"] = calculate_final_rating(h.get("Rating"), h.get("Property_type"), h.get("Hotel_name"))

    # Write to CSV cache
    csv_filename = f'hotels_{city_code}_{checkin_date}_{checkout_date}.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'hotelId', 'Hotel_name', 'Address', 'Latitude', 'Longitude',
            'Property_type', 'Room_status', 'Price', 'Currency',
            'Rating', 'Final_rating'])
        writer.writeheader()
        writer.writerows(hotel_list)

    return hotel_list


@app.route('/live_recommend', methods=['POST'])
def live_recommend():
    data = request.get_json()
    print(f"live_recommend called with data: {data}")

    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    city = data.get("city")
    checkin = data.get("checkin_date")
    checkout = data.get("checkout_date")
    adults = data.get("adults", 1)

    if not city or city.lower() not in CITY_CODES:
        print(f"Invalid or unsupported city: {city}")
        return jsonify({"error": "Invalid or unsupported city"}), 400
    if not checkin or not checkout:
        print("Missing checkin or checkout date")
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'"}), 400

    city = city.lower()
    adults = int(adults)

    city_code = CITY_CODES[city]

    try:
        # Only delete cache files for same city that have different checkin/checkout dates
        delete_old_csvs(city_code, checkin, checkout)
    except Exception as e:
        print(f"Error cleaning cache files: {e}")

    csv_filename = f'hotels_{city_code}_{checkin}_{checkout}.csv'

    if os.path.exists(csv_filename):
        print(f"Found cached file: {csv_filename}, loading...")
        try:
            df = pd.read_csv(csv_filename)
            df = df.where(pd.notnull(df), None)
            hotels = df.to_dict(orient='records')
            hotels = recursively_clean(hotels)
            print(f"Loaded {len(hotels)} hotels from cache")
            return jsonify({
                "message": "Loaded cached data",
                "hotel_count": len(hotels),
                "hotels": hotels,
                "from_cache": True,
            })
        except Exception as e:
            print(f"Failed to read cache file: {e}")

    try:
        # Fetch fresh data from API and cache it
        hotel_list = fetch_and_cache_hotels(city, checkin, checkout, adults)
        return jsonify({
            "message": f"Found {len(hotel_list)} hotels with offers.",
            "hotel_count": len(hotel_list),
            "hotels": hotel_list,
            "from_cache": False,
        })
    except Exception as exc:
        print(f"Error in live_recommend: {exc}")
        return jsonify({"error": "Failed fetching hotels", "details": str(exc)}), 500


@app.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    print(f"Refresh called with data: {data}")

    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    city = data.get("city")
    checkin = data.get("checkin_date")
    checkout = data.get("checkout_date")
    adults = data.get("adults", 1)

    if not city or city.lower() not in CITY_CODES:
        print(f"Invalid or unsupported city: {city}")
        return jsonify({"error": "Invalid or unsupported city"}), 400
    if not checkin or not checkout:
        print("Missing checkin or checkout date")
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'"}), 400

    city = city.lower()
    adults = int(adults)

    try:
        hotel_list = fetch_and_cache_hotels(city, checkin, checkout, adults)
        print(f"Refreshed {len(hotel_list)} hotels from API")
        return jsonify({
            "message": f"Refreshed data with {len(hotel_list)} hotels.",
            "hotel_count": len(hotel_list),
            "hotels": hotel_list,
            "refreshed": True,
        })
    except Exception as exc:
        print(f"Error in refresh: {exc}")
        return jsonify({"error": "Error refreshing hotel data", "details": str(exc)}), 500


@app.route('/oyo_hotels', methods=['POST'])
def oyo_hotels():
    data = request.get_json() or {}
    city = data.get('city')
    if not city:
        return jsonify({"error": "Missing 'city' parameter"}), 400
    city_query = city.lower().strip()

    try:
        df = load_oyo_hotels()
        filtered = df[df['City'].str.lower() == city_query]
        count = len(filtered)
        if count == 0:
            print(f"No OYO hotels found for city {city}")
            return jsonify({
                "message": f"No hotels found for city '{city}'",
                "hotel_count": 0,
                "hotels": []
            })

        hotels = filtered.fillna("").to_dict(orient="records")
        for h in hotels:
            for key in ["Latitude", "Longitude", "Price", "Rating", "Final_rating"]:
                if h.get(key) == "" or pd.isna(h.get(key)):
                    h[key] = None
            if not h.get("Property_type"):
                h["Property_type"] = "hotel"
            if not h.get("Room_status"):
                h["Room_status"] = ""
            if not h.get("Currency"):
                h["Currency"] = "INR"

        print(f"Returning {count} OYO hotels in city {city}")
        return jsonify({"hotel_count": count, "hotels": hotels})
    except Exception as e:
        print(f"Error in /oyo_hotels: {e}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


# if __name__ == "__main__":
#     app.run(debug=True)





























