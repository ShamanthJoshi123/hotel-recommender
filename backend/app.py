from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import requests
import os
from dotenv import load_dotenv
import time
import csv
import random
import math  # for isnan check
import glob

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY")
AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET")

CITY_CODES = {
    "agra": "AGR",
    "ahmedabad": "AMD",
    "ajmer": "AII",
    "allahabad": "IXD",
    "amritsar": "ATQ",
    "aurangabad": "IXU",
    "bengaluru": "BLR",
    "bangalore": "BLR",  # synonym
    "bhopal": "BHO",
    "bhubaneswar": "BBI",
    "chandigarh": "IXC",
    "chennai": "MAA",
    "cochin": "COK",
    "coimbatore": "CJB",
    "delhi": "DEL",
    "goa": "GOI",
    "gurgaon": "DEL",
    "gwalior": "GWL",
    "hyderabad": "HYD",
    "imphal": "IMF",
    "indore": "IDR",
    "jaipur": "JAI",
    "jammu": "IXJ",
    "jodhpur": "JDH",
    "kanpur": "KNU",
    "kochi": "COK",  # synonym for Cochin
    "kolkata": "CCU",
    "lucknow": "LKO",
    "ludhiana": "LUH",
    "madurai": "IXM",
    "mangalore": "IXE",
    "mumbai": "BOM",
    "nagpur": "NAG",
    "nashik": "ISK",
    "pune": "PNQ",
    "ranchi": "IXR",
    "shivamogga": "SMEG",
    "surat": "STV",
    "thane": "BOM",
    "trenall": "TRZ",
    "tirupati": "TIR",
    "trivandrum": "TRV",
    "udupi": "MPO",
    "varanasi": "VNS",
    "vadodara": "BDQ",
    "vijayawada": "VGA",
    "visakhapatnam": "VTZ",
}

# Your existing helper functions remain unchanged...

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
    print("Requesting access token...")
    url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    data = {'grant_type': 'client_credentials', 'client_id': api_key, 'client_secret': api_secret}
    resp = requests.post(url, data=data)
    resp.raise_for_status()
    token = resp.json().get('access_token')
    if not token:
        raise Exception("Failed to get access token")
    print("Access token acquired.")
    return token.strip()

def get_hotel_list(city_code, token):
    print(f"Fetching hotel list for city code: {city_code}")
    url = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city"
    headers = {'Authorization': f'Bearer {token}'}
    params = {'cityCode': city_code}
    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    hotels = data.get('data', [])
    print(f"Fetched {len(hotels)} hotels.")
    return hotels

def get_hotel_offers_amadeus_batch(hotel_ids, checkin, checkout, token, adults):
    print(f"Querying hotel offers for batch of {len(hotel_ids)} hotels...")
    url = "https://test.api.amadeus.com/v3/shopping/hotel-offers"
    headers = {'Authorization': f'Bearer {token}'}
    params = {
        'hotelIds': ','.join(hotel_ids),
        'adults': adults,
        'checkInDate': checkin,
        'checkOutDate': checkout
    }
    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    offers_count = len(data.get('data', []))
    print(f"Received {offers_count} hotel offers.")
    return data

def pick_hotels(all_hotels, sample_size=90):
    luxury_brands = ['taj', 'oberoi', 'leela', 'ritz carlton', 'conrad', 'fairmont']
    mid_brands = ['marriott', 'hilton', 'hyatt', 'novotel', 'holiday inn', 'intercontinental']
    popular_brands = set(luxury_brands + mid_brands)

    def has_popular_brand(name):
        if not name:
            return False
        name = name.lower()
        return any(b in name for b in popular_brands)

    best = []
    rest = []
    for h in all_hotels:
        try:
            r = float(h.get('rating', 0))
        except:
            r = 0
        if r >= 4.0 and has_popular_brand(h.get('name', '')):
            best.append(h)
        else:
            rest.append(h)

    print(f"Best bucket: {len(best)}, Rest bucket: {len(rest)}")
    best_sample = random.sample(best, min(10, len(best)))
    remaining_needed = sample_size - len(best_sample)
    rest_sample = random.sample(rest, min(remaining_needed, len(rest)))
    combined = best_sample + rest_sample
    random.shuffle(combined)
    print(f"Total selected hotels: {len(combined)}")
    return combined

def recursively_clean(obj):
    """
    Recursively traverse lists/dicts and replace NaN or Inf with None.
    """
    if isinstance(obj, dict):
        return {k: recursively_clean(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [recursively_clean(elem) for elem in obj]
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
    selected = pick_hotels(hotels, sample_size=90)
    hotel_ids = [h['hotelId'] for h in selected if 'hotelId' in h]

    batch_size = 30
    offers = []
    idx = 0
    while idx < len(hotel_ids):
        batch = hotel_ids[idx:idx + batch_size]
        data = get_hotel_offers_amadeus_batch(batch, checkin_date, checkout_date, token, adults)
        offers.extend(data.get('data', []))
        idx += batch_size
        time.sleep(0.3)

    hotel_map = {h['hotelId']: h for h in hotels}
    merged = {}

    for o in offers:
        hid = o.get('hotel', {}).get('hotelId')
        if not hid:
            continue
        info_offer = o.get('hotel', {})
        info_list = hotel_map.get(hid, {})

        addr = info_offer.get('address', {}).get('lines', []) or info_list.get('address', {}).get('lines', []) or []
        lat = info_offer.get('geoCode', {}).get('latitude') or info_list.get('geoCode', {}).get('latitude')
        lng = info_offer.get('geoCode', {}).get('longitude') or info_list.get('geoCode', {}).get('longitude')
        prop_type = info_offer.get('type') or info_list.get('type')
        rating = info_offer.get('rating') or info_list.get('rating')

        if hid not in merged:
            merged[hid] = {
                'hotelId': hid,
                'Hotel_name': info_offer.get('name') or info_list.get('name', ''),
                'Address': " | ".join(addr),
                'Latitude': lat or '',
                'Longitude': lng or '',
                'Property_type': prop_type or '',
                'Room_status': 'Available' if o.get('offers') else 'Unavailable',
                'Price': None,
                'Currency': None,
                'Rating': rating or '',
                'Final_rating': None
            }

        if merged[hid]['Price'] is None and o.get('offers'):
            p = o['offers'][0].get('price', {})
            merged[hid]['Price'] = p.get('total')
            merged[hid]['Currency'] = p.get('currency')

    hotel_list = list(merged.values())
    hotel_list = recursively_clean(hotel_list)
    for h in hotel_list:
        h['Final_rating'] = calculate_final_rating(h.get('Rating'), h.get('Property_type'), h.get('Hotel_name'))

    # Write to CSV
    csv_filename = f'hotels_{city_code}_{checkin_date}_{checkout_date}.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['hotelId', 'Hotel_name', 'Address', 'Latitude', 'Longitude',
                                               'Property_type', 'Room_status', 'Price', 'Currency',
                                               'Rating', 'Final_rating'])
        writer.writeheader()
        writer.writerows(hotel_list)

    return hotel_list

# New helper to delete old CSV files for the same city but different date ranges
def delete_old_csvs(city_code, current_checkin, current_checkout):
    pattern = f'hotels_{city_code}_*.csv'
    csv_files = glob.glob(pattern)
    for file in csv_files:
        # Extract checkin and checkout parts from filename
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

@app.route('/live_recommend', methods=['POST'])
def live_recommend():
    data = request.json or {}
    city = data.get('city', '').strip().lower()
    checkin_date = data.get('checkin_date')
    checkout_date = data.get('checkout_date')
    adults = int(data.get('adults', 1))

    if city not in CITY_CODES:
        return jsonify({"error": f"City '{city}' not supported."}), 400
    if not checkin_date or not checkout_date:
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'."}), 400

    city_code = CITY_CODES[city]

    # Delete old CSV files of this city but different dates
    delete_old_csvs(city_code, checkin_date, checkout_date)

    csv_filename = f'hotels_{city_code}_{checkin_date}_{checkout_date}.csv'

    if os.path.exists(csv_filename):
        try:
            df = pd.read_csv(csv_filename)
            df = df.where(pd.notnull(df), None)
            data = df.to_dict(orient="records")
            data = recursively_clean(data)
            return jsonify({"message": "Loaded cached data",
                            "hotel_count": len(df),
                            "hotels": data,
                            "from_cache": True})
        except Exception as e:
            print(f"Error reading CSV cache: {e}")

    try:
        hotel_list = fetch_and_cache_hotels(city, checkin_date, checkout_date, adults)
        return jsonify({"message": f"Found {len(hotel_list)} hotels with offers.",
                        "hotel_count": len(hotel_list),
                        "hotels": hotel_list,
                        "from_cache": False})
    except Exception as ex:
        print("Error in live_recommend:", ex)
        return jsonify({"error": "Error fetching hotel data", "details": str(ex)}), 500

@app.route('/refresh', methods=['POST'])
def refresh():
    data = request.json or {}
    city = data.get('city', '').strip().lower()
    checkin_date = data.get('checkin_date')
    checkout_date = data.get('checkout_date')
    adults = int(data.get('adults', 1))

    if city not in CITY_CODES:
        return jsonify({"error": f"City '{city}' not supported."}), 400
    if not checkin_date or not checkout_date:
        return jsonify({"error": "Please provide valid 'checkin_date' and 'checkout_date'."}), 400

    try:
        hotel_list = fetch_and_cache_hotels(city, checkin_date, checkout_date, adults)
        return jsonify({"message": f"Refreshed data with {len(hotel_list)} hotels.",
                        "hotel_count": len(hotel_list),
                        "hotels": hotel_list,
                        "refreshed": True})
    except Exception as ex:
        print("Error in refresh:", ex)
        return jsonify({"error": "Error refreshing hotel data", "details": str(ex)}), 500

if __name__ == '__main__':
    app.run(debug=True)


























