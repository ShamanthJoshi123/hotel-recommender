# ============================
# app.py - Flask Backend for Hotel Recommender
# ============================

from flask import Flask, request, jsonify       # Flask web framework and helpers
from flask_cors import CORS                     # To allow Cross-Origin requests from frontend
import pandas as pd                              # For handling CSV data
import requests                                  # For making HTTP requests (Amadeus API)
import os                                        # For environment variables and file operations
from dotenv import load_dotenv                   # For loading .env file variables
import time, csv, random, math, glob             # Misc utilities

# ----------------------------
# 1. Load environment variables
# ----------------------------
load_dotenv()  # Read variables from .env (like API keys) into environment

# ----------------------------
# 2. Create Flask app and configure CORS
# ----------------------------
app = Flask(__name__)
# Only allow frontend on specified domain to make requests
CORS(app, origins=["https://hotel-recommender.vercel.app"])

# ----------------------------
# 3. Constants & Globals
# ----------------------------

# Path to preprocessed local OYO hotels CSV
OYO_CSV_PATH = 'OYO_HOTELS_792_transformed.csv'

# Mapping of human-readable city names to Amadeus API city codes
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

# Amadeus API credentials from .env
AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY")
AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET")

# Hold OYO dataset in memory after first load to speed up future requests
oyo_hotels_df = None

# ----------------------------
# 4. Helper: Load OYO CSV
# ----------------------------
def load_oyo_hotels():
    """
    Loads the local transformed OYO hotels dataset into memory (pandas DataFrame).
    Uses caching so the CSV is read only once per server run.

    Returns:
        pd.DataFrame: OYO hotels dataset
    """
    global oyo_hotels_df
    if oyo_hotels_df is None:
        if not os.path.exists(OYO_CSV_PATH):
            raise FileNotFoundError(f"{OYO_CSV_PATH} not found.")
        print(f"Loading OYO dataset from {OYO_CSV_PATH}...")
        oyo_hotels_df = pd.read_csv(OYO_CSV_PATH)
        print(f"Loaded {len(oyo_hotels_df)} hotels from static dataset.")
    return oyo_hotels_df

# ----------------------------
# 5. Helper: Recursive Data Cleaner
# ----------------------------
def recursively_clean(obj):
    """
    Recursively clean data structures to make them JSON-safe.
    Replaces NaN and Infinity float values with None.
    """
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

# ----------------------------
# 6. Helper: Calculate Final Rating
# ----------------------------
def calculate_final_rating(raw_rating, property_type, hotel_name=None):
    """
    Generates a consistent 0-5 scale 'Final_rating' for each hotel.

    Steps:
        - Use given rating if already 0-5
        - Else assign default rating per property_type
        - Boost score slightly for popular luxury brands
        - Add tiny randomness to avoid ties

    Returns:
        float: final rating between 0 and 5
    """
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

    # Fallback rating based on property type
    if base is None:
        prop_score_map = {
            'hotel': 4.0,
            'apartment': 3.5,
            'hostel': 2.5,
            'resort': 4.5,
            'villa': 4.0
        }
        base = prop_score_map.get((property_type or "").lower(), 3.0)

    # Add brand boost
    boost = 0.0
    if hotel_name:
        name = hotel_name.lower()
        for brand in popular_brands:
            if brand in name:
                boost = 0.2
                break

    # Add tiny random noise
    noise = random.uniform(-0.1, 0.1)

    final_rating = base + boost + noise
    # Clamp between 0 and 5
    final_rating = max(0, min(5, final_rating))

    return round(final_rating, 2)

# ----------------------------
# 7. Amadeus API: Auth Token
# ----------------------------
def get_amadeus_access_token(api_key, api_secret):
    """
    Requests an access token from Amadeus API using OAuth2 client credentials.
    The returned token is required for all further Amadeus requests.
    """
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

# ----------------------------
# 8. Amadeus API: Get Hotels List
# ----------------------------
def get_hotel_list(city_code, token):
    """
    Fetches a list of hotels in a given city from Amadeus API.
    Returns basic metadata like name, address, coordinates, but no prices.
    """
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

# ----------------------------
# 9. Amadeus API: Get Hotel Offers in Batch
# ----------------------------
def get_hotel_offers_batch(hotel_ids, checkin, checkout, token, adults):
    """
    Fetches prices and availability for multiple hotels by their IDs in one API call.
    """
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

# ----------------------------
# 10. Pick a Random Subset of Hotels
# ----------------------------
def pick_hotels(all_hotels, sample_size=60):
    """
    Randomly sample up to `sample_size` hotels from the full list to limit API load.
    """
    if len(all_hotels) <= sample_size:
        sampled = all_hotels.copy()
    else:
        sampled = random.sample(all_hotels, sample_size)
    print(f"Picked total {len(sampled)} hotels randomly")
    return sampled

# ----------------------------
# 11. Delete Old Cache CSVs
# ----------------------------
def delete_old_csvs(city_code, current_checkin, current_checkout):
    """
    Deletes previously cached CSV files for the same city but with different date ranges.
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

# ============================
# 12. Main Fetch-Orchestrator
# ============================
def fetch_and_cache_hotels(city, checkin_date, checkout_date, adults):
    """
    Orchestrates fetching live hotel data from Amadeus for a city and date range.

    Steps:
        1. Convert city name to Amadeus city code.
        2. Get short-lived access token.
        3. Fetch complete hotel list for city.
        4. Randomly pick up to 60 hotels.
        5. Request offers (prices/availability) in batches (20 at a time).
        6. Merge "hotel info" + "offers" into single data structure.
        7. Clean invalid values (NaN, inf → None).
        8. Calculate a consistent 0-5 'Final_rating'.
        9. Save processed list to a CSV cache for reuse.
        10. Return the processed list.
    """
    city_code = CITY_CODES[city]  # Map city to Amadeus code

    # 1. Authenticate to Amadeus
    token = get_amadeus_access_token(AMADEUS_API_KEY, AMADEUS_API_SECRET)

    # 2. Fetch base hotel list (no prices yet)
    hotels = get_hotel_list(city_code, token)
    if not hotels:
        raise Exception(f"No hotels found for city '{city}'.")

    # 3. Pick max 60 hotels randomly to reduce API calls
    selected = pick_hotels(hotels, sample_size=60)
    hotel_ids = [h['hotelId'] for h in selected if 'hotelId' in h]

    # Batch config for offers requests
    batch_size = 20   # API call will contain max 20 hotel IDs
    offers = []       # List to store offers data
    idx = 0
    max_ids = 60
    hotel_ids = hotel_ids[:max_ids]  # Safety cap

    # 4. Fetch offers in batches
    while idx < len(hotel_ids):
        batch = hotel_ids[idx: idx + batch_size]
        data = get_hotel_offers_batch(batch, checkin_date, checkout_date, token, adults)
        offers.extend(data.get('data', []))
        idx += batch_size
        time.sleep(1.0)  # Pause to avoid hitting API rate limits

    # 5. Map hotelId → hotel info from base list for quick lookup
    hotel_map = {h['hotelId']: h for h in hotels}

    # 6. Merge base info + offers into final dict
    merged = {}
    for o in offers:
        hid = o.get("hotel", {}).get("hotelId")
        if not hid:
            continue

        info_offer = o.get("hotel", {})
        info_list = hotel_map.get(hid, {})

        # Grab address, coords, property type, rating from whichever source has it
        addr = info_offer.get("address", {}).get("lines", []) or info_list.get("address", {}).get("lines", []) or []
        lat = info_offer.get("geoCode", {}).get("latitude") or info_list.get("geoCode", {}).get("latitude")
        lng = info_offer.get("geoCode", {}).get("longitude") or info_list.get("geoCode", {}).get("longitude")
        prop_type = info_offer.get("type") or info_list.get("type")
        rating = info_offer.get("rating") or info_list.get("rating")

        # If this hotel not yet in merged dict — create it
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

        # Fill price/currency from first available offer (if not already set)
        if merged[hid]["Price"] is None and o.get("offers"):
            price_info = o["offers"][0].get("price", {})
            merged[hid]["Price"] = price_info.get("total")
            merged[hid]["Currency"] = price_info.get("currency")

    # 7. Convert to list for cleaning and rating calculation
    hotel_list = list(merged.values())
    hotel_list = recursively_clean(hotel_list)  # Clean NaN, Inf

    # 8. Calculate consistent 0–5 final rating for each hotel
    for h in hotel_list:
        h["Final_rating"] = calculate_final_rating(h.get("Rating"), h.get("Property_type"), h.get("Hotel_name"))

    # 9. Save processed data to CSV cache
    csv_filename = f'hotels_{city_code}_{checkin_date}_{checkout_date}.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'hotelId', 'Hotel_name', 'Address', 'Latitude', 'Longitude',
            'Property_type', 'Room_status', 'Price', 'Currency',
            'Rating', 'Final_rating'
        ])
        writer.writeheader()
        writer.writerows(hotel_list)

    # 10. Return to caller
    return hotel_list


# ============================
# 13. ROUTES
# ============================

@app.route('/live_recommend', methods=['POST'])
def live_recommend():
    """
    Live hotel recommendations.
    - Checks for cached results (city+dates CSV)
    - If found → returns cached
    - If not → fetches from Amadeus, caches, and returns
    """
    data = request.get_json()
    print(f"live_recommend called with data: {data}")
    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    # Extract required fields
    city = data.get("city")
    checkin = data.get("checkin_date")
    checkout = data.get("checkout_date")
    adults = data.get("adults", 1)

    # City validation
    if not city or city.lower() not in CITY_CODES:
        return jsonify({"error": "Invalid or unsupported city"}), 400
    if not checkin or not checkout:
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'"}), 400

    city = city.lower()
    adults = int(adults)
    city_code = CITY_CODES[city]

    # Clean up old cache files for city with other dates
    try:
        delete_old_csvs(city_code, checkin, checkout)
    except Exception as e:
        print(f"Error cleaning cache files: {e}")

    # Check cache
    csv_filename = f'hotels_{city_code}_{checkin}_{checkout}.csv'
    if os.path.exists(csv_filename):
        try:
            df = pd.read_csv(csv_filename)
            df = df.where(pd.notnull(df), None)    # Replace NaN with None
            hotels = df.to_dict(orient='records')
            hotels = recursively_clean(hotels)
            return jsonify({
                "message": "Loaded cached data",
                "hotel_count": len(hotels),
                "hotels": hotels,
                "from_cache": True,
            })
        except Exception as e:
            print(f"Failed to read cache file: {e}")

    # No cache → fetch fresh
    try:
        hotel_list = fetch_and_cache_hotels(city, checkin, checkout, adults)
        return jsonify({
            "message": f"Found {len(hotel_list)} hotels with offers.",
            "hotel_count": len(hotel_list),
            "hotels": hotel_list,
            "from_cache": False,
        })
    except Exception as exc:
        return jsonify({"error": "Failed fetching hotels", "details": str(exc)}), 500


@app.route('/refresh', methods=['POST'])
def refresh():
    """
    Force refresh via Amadeus — always fetches live data even if cache exists.
    """
    data = request.get_json()
    print(f"Refresh called with data: {data}")
    if not data:
        return jsonify({"error": "No JSON body received"}), 400

    # Extract & validate
    city = data.get("city")
    checkin = data.get("checkin_date")
    checkout = data.get("checkout_date")
    adults = data.get("adults", 1)
    if not city or city.lower() not in CITY_CODES:
        return jsonify({"error": "Invalid or unsupported city"}), 400
    if not checkin or not checkout:
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'"}), 400

    city = city.lower()
    adults = int(adults)

    # Always fetch fresh
    try:
        hotel_list = fetch_and_cache_hotels(city, checkin, checkout, adults)
        return jsonify({
            "message": f"Refreshed data with {len(hotel_list)} hotels.",
            "hotel_count": len(hotel_list),
            "hotels": hotel_list,
            "refreshed": True,
        })
    except Exception as exc:
        return jsonify({"error": "Error refreshing hotel data", "details": str(exc)}), 500


@app.route('/oyo_hotels', methods=['POST'])
def oyo_hotels():
    """
    Return OYO hotels from local static CSV (instant, no external API calls).
    Filters by 'city' given in request body.
    """
    data = request.get_json() or {}
    city = data.get('city')
    if not city:
        return jsonify({"error": "Missing 'city' parameter"}), 400

    city_query = city.lower().strip()
    try:
        df = load_oyo_hotels()  # Cached DataFrame
        filtered = df[df['City'].str.lower() == city_query]
        count = len(filtered)
        if count == 0:
            return jsonify({
                "message": f"No hotels found for city '{city}'",
                "hotel_count": 0,
                "hotels": []
            })

        hotels = filtered.fillna("").to_dict(orient="records")

        # Data cleaning for JSON compatibility
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

        return jsonify({"hotel_count": count, "hotels": hotels})

    except Exception as e:
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

