import csv
import random
import string

input_csv = 'OYO_HOTEL_ROOMS.csv'  # Path to your original dataset
output_csv = 'OYO_HOTELS_792_transformed.csv'  # Desired output filename

# List of cities to look for in hotel info - add more as needed
KNOWN_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata',
    'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
    'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
    'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
    'Ludhiana', 'Agra', 'Nashik', 'Faridabad'
]

def generate_hotel_id():
    # Generate hotel id like 'OI' + 6 random uppercase letters
    return 'OI' + ''.join(random.choices(string.ascii_uppercase, k=6))

def clean_hotel_name(raw_name):
    # Remove prefix "OYO " if present (case insensitive)
    name = raw_name.strip()
    if name.lower().startswith('oyo '):
        name = name[4:]
    # Remove trailing ' Near ...' part if present
    if ' Near ' in name:
        name = name.split(' Near ')[0]
    return name.strip()

def convert_rating(raw_rating, max_raw=1000):
    try:
        rating = float(raw_rating)
    except:
        rating = 0
    val = 1 + min(rating, max_raw) / max_raw * 4  # Scale from 1 to 5
    return round(val, 1)

def extract_city(hotel_name, address):
    text = f"{hotel_name} {address}".lower()
    for city in KNOWN_CITIES:
        if city.lower() in text:
            return city
    return "Unknown"

with open(input_csv, 'r', encoding='utf-8') as infile, \
     open(output_csv, 'w', newline='', encoding='utf-8') as outfile:
    
    reader = csv.DictReader(infile)
    
    fieldnames = [
        'hotelId', 'Hotel_name', 'Address', 'City', 'Latitude',
        'Longitude', 'Property_type', 'Room_status',
        'Price', 'Currency', 'Rating', 'Final_rating'
    ]
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    
    for row in reader:
        hotel_id = generate_hotel_id()
        hotel_name_original = row.get('Hotel_name', '')
        hotel_name = clean_hotel_name(hotel_name_original)
        address = row.get('Location', '').strip()
        city = extract_city(hotel_name_original, address)
        price = row.get('Price', '').strip()
        rating_raw = row.get('Rating', '').strip()

        output_row = {
            'hotelId': hotel_id,
            'Hotel_name': hotel_name,
            'Address': address,
            'City': city,
            'Latitude': '',
            'Longitude': '',
            'Property_type': 'hotel',
            'Room_status': '',
            'Price': price,
            'Currency': 'INR',
            'Rating': rating_raw,
            'Final_rating': convert_rating(rating_raw)
        }

        writer.writerow(output_row)

print(f'Transformed dataset with city saved as {output_csv}')
