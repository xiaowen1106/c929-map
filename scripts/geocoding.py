import csv
import requests
import time
import hashlib
import os
import json
import random
import math
import html
from urllib.parse import quote

# File paths
INPUT_CSV = 'source/messages.csv'
OUTPUT_GEOJSON = 'docs/data/messages_geocoded.geojson'
CACHE_FILE = 'source/geocode_cache.json'

# Mapbox API token (replace with your actual token)
MAPBOX_TOKEN = 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFwMmU1ZnkwZHJ6MmxwdnloemZhY3I0In0.TiHvo3M3CHK0ciLiNC77iQ'

# Column names (as in the CSV header)
DISPLAY_NAME_COL = '您希望在地图上展示的名字 Your Display Name on the Map'
MESSAGE_COL = '【选填 Optional】给深深的留言/祝福(将展示在以上所填地点) Message/Blessing for Zhou Shen (Will be displayed at the location you provided above)'
ZIP_COL = '【选填 Optional】您的邮编代码 Your ZIP Code'
COUNTRY_COL = '您所在的国家 Which country are you in?'
CITY_COL = '您所在的城市 Which city are you in?'

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points using the Haversine formula.
    Returns distance in kilometers.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

def order_messages_by_proximity(features, cluster_radius_km=50.0):
    """
    Order messages by geographic proximity using a simple clustering approach.
    Groups messages within cluster_radius_km of each other and orders them by distance.
    
    Args:
        features: List of GeoJSON features
        cluster_radius_km: Maximum distance to consider messages as part of the same cluster
    
    Returns:
        List of features ordered by geographic proximity
    """
    if not features:
        return features
    
    # Extract coordinates and create feature tuples
    feature_tuples = []
    for feature in features:
        coords = feature['geometry']['coordinates']
        lat, lon = coords[1], coords[0]  # GeoJSON uses [lon, lat] order
        feature_tuples.append((lat, lon, feature))
    
    ordered_features = []
    used_indices = set()
    
    # Start with the first feature
    current_idx = 0
    ordered_features.append(feature_tuples[current_idx][2])
    used_indices.add(current_idx)
    
    # Find the next closest feature within cluster radius
    while len(used_indices) < len(feature_tuples):
        current_lat, current_lon = feature_tuples[current_idx][0], feature_tuples[current_idx][1]
        
        # Find the closest unused feature within cluster radius
        closest_idx = None
        min_distance = float('inf')
        
        for i, (lat, lon, _) in enumerate(feature_tuples):
            if i in used_indices:
                continue
                
            distance = calculate_distance(current_lat, current_lon, lat, lon)
            
            # Only consider features within cluster radius
            if distance <= cluster_radius_km and distance < min_distance:
                min_distance = distance
                closest_idx = i
        
        # If no close features found, find the closest unused feature regardless of distance
        if closest_idx is None:
            for i, (lat, lon, _) in enumerate(feature_tuples):
                if i in used_indices:
                    continue
                    
                distance = calculate_distance(current_lat, current_lon, lat, lon)
                if distance < min_distance:
                    min_distance = distance
                    closest_idx = i
        
        if closest_idx is not None:
            ordered_features.append(feature_tuples[closest_idx][2])
            used_indices.add(closest_idx)
            current_idx = closest_idx
        else:
            break
    
    return ordered_features

# Load or initialize geocode cache
def load_cache():
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            # If cache file is corrupted or doesn't exist, start fresh
            cache = {}
    return cache

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def extract_location_data(feature):
    """Extract location data from Mapbox geocoding response feature"""
    context = feature.get('context', [])
    place_name = feature.get('place_name', '')
    
    # Extract country and city from context
    country = ''
    city = ''
    
    for item in context:
        if item.get('id', '').startswith('country'):
            country = item.get('text', '')
        elif item.get('id', '').startswith('place'):
            city = item.get('text', '')
        elif item.get('id', '').startswith('region'):
            # Use region as city if no place found
            if not city:
                city = item.get('text', '')
    
    # If no city found in context, try to extract from place_name
    if not city and place_name:
        parts = place_name.split(', ')
        if len(parts) > 1:
            city = parts[0]
    
    # Create a clean location string
    location_parts = []
    if city:
        location_parts.append(city)
    if country:
        location_parts.append(country)
    
    locationString = ', '.join(location_parts) if location_parts else place_name
    
    return {
        'country': country,
        'city': city,
        'locationString': locationString
    }

def geocode(query, cache):
    if query in cache:
        return cache[query]
    
    url = f'https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(query)}.json'
    params = {
        'access_token': MAPBOX_TOKEN,
        'limit': 1,
        'language': 'en'
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        if data['features']:
            feature = data['features'][0]
            cache[query] = feature
            time.sleep(0.1)  # Be nice to the API
            return feature
    
    # If geocoding failed, cache None
    cache[query] = None
    return None

def add_random_offset(lat, lon, radius_km=2.0):
    """
    Add a random offset within the specified radius (in km) from the given coordinates.
    Uses the Haversine formula to ensure the offset is within the specified distance.
    """
    # Convert radius from km to degrees (approximate)
    # 1 degree of latitude ≈ 111 km
    # 1 degree of longitude ≈ 111 * cos(latitude) km
    lat_rad = math.radians(lat)
    lat_degree_km = 111.0
    lon_degree_km = 111.0 * math.cos(lat_rad)
    
    # Generate random angle and distance
    angle = random.uniform(0, 2 * math.pi)
    # Use square root for uniform distribution within circle
    distance_ratio = math.sqrt(random.uniform(0, 1))
    distance_km = distance_ratio * radius_km
    
    # Calculate offset in degrees
    lat_offset = (distance_km * math.cos(angle)) / lat_degree_km
    lon_offset = (distance_km * math.sin(angle)) / lon_degree_km
    
    return lat + lat_offset, lon + lon_offset

def find_unique_coordinates(lat, lon, used_coordinates, radius_km=5.0, max_attempts=100, always_randomize=False):
    """
    Find unique coordinates by applying systematic offsets when the original coordinates are already used.
    Returns the first available unique coordinates within the specified radius.
    
    Args:
        always_randomize: If True, always apply randomization even if coordinates are unique
    """
    # Round coordinates to 5 decimal places for comparison (approximately 10 meter precision)
    precision = 5
    base_lat = round(lat, precision)
    base_lon = round(lon, precision)
    
    # Check if base coordinates are available
    if (base_lat, base_lon) not in used_coordinates and not always_randomize:
        used_coordinates.add((base_lat, base_lon))
        return lat, lon, False
    
    # Convert radius from km to degrees (approximate)
    lat_rad = math.radians(lat)
    lat_degree_km = 111.0
    lon_degree_km = 111.0 * math.cos(lat_rad)
    
    # Try systematic positions in concentric circles with increasing radius
    for attempt in range(1, max_attempts + 1):
        # Use golden angle for better distribution
        angle = attempt * 2.39996322972865332  # golden angle in radians
        
        # Create multiple concentric circles to better utilize the full radius
        # Use different distance ratios to cover the area more uniformly
        if attempt <= max_attempts // 3:
            # Inner circle: 0 to 33% of radius
            distance_ratio = (attempt / (max_attempts // 3)) * 0.33
        elif attempt <= 2 * max_attempts // 3:
            # Middle circle: 33% to 66% of radius
            distance_ratio = 0.33 + ((attempt - max_attempts // 3) / (max_attempts // 3)) * 0.33
        else:
            # Outer circle: 66% to 100% of radius
            distance_ratio = 0.66 + ((attempt - 2 * max_attempts // 3) / (max_attempts // 3)) * 0.34
        
        distance_km = distance_ratio * radius_km
        
        # Calculate offset in degrees
        lat_offset = (distance_km * math.cos(angle)) / lat_degree_km
        lon_offset = (distance_km * math.sin(angle)) / lon_degree_km
        
        new_lat = lat + lat_offset
        new_lon = lon + lon_offset
        
        # Round to precision for comparison
        rounded_lat = round(new_lat, precision)
        rounded_lon = round(new_lon, precision)
        
        if (rounded_lat, rounded_lon) not in used_coordinates:
            used_coordinates.add((rounded_lat, rounded_lon))
            return new_lat, new_lon, True
    
    # If all attempts failed, use the original coordinates with a random offset
    # This should rarely happen, but ensures the script doesn't fail
    final_lat, final_lon = add_random_offset(lat, lon, radius_km)
    rounded_lat = round(final_lat, precision)
    rounded_lon = round(final_lon, precision)
    used_coordinates.add((rounded_lat, rounded_lon))
    return final_lat, final_lon, True

def escape_html(text):
    """Escape HTML special characters to prevent XSS and rendering issues"""
    if not text:
        return text
    return html.escape(text, quote=False)

def main():
    cache = load_cache()
    used_coordinates = set()  # Track used coordinates to ensure uniqueness
    
    # Initialize GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    with open(INPUT_CSV, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        msg_id = 1
        
        for row in reader:
            display_name = escape_html(row.get(DISPLAY_NAME_COL, '').strip())
            message = escape_html(row.get(MESSAGE_COL, '').strip())
            zip_code = row.get(ZIP_COL, '').strip()
            country = row.get(COUNTRY_COL, '').strip()
            city = row.get(CITY_COL, '').strip()
            
            # Skip if no display name or message
            if not display_name or not message:
                continue
                
            # Create query string for geocoding
            has_zipcode = bool(zip_code)
            if zip_code:
                location_str = f"{zip_code}, {country}" if country else zip_code
            else:
                location_str = f"{city}, {country}" if city and country else city or country
                
            if not location_str:
                continue
                
            # Geocode the location
            geocode_result = geocode(location_str, cache)
            
            # Skip if geocoding failed
            if not geocode_result:
                continue
                
            # Extract coordinates from the feature
            lon, lat = geocode_result['center']
            
            # Determine randomization radius based on whether zipcode is provided
            # Use larger radius for city-based locations (no zipcode) to spread out more
            if has_zipcode:
                randomization_radius = 5.0  # 5km radius for zipcode-based locations
            else:
                randomization_radius = 15.0  # 15km radius for city-based locations
            
            # Find unique coordinates, applying offset if necessary
            # Always randomize for messages without zipcode
            final_lat, final_lon, has_offset = find_unique_coordinates(lat, lon, used_coordinates, randomization_radius, always_randomize=not has_zipcode)
            
            # Extract location data from the response
            location_data = extract_location_data(geocode_result)
            
            # Use geocoded location data instead of CSV data
            geocoded_country = location_data['country']
            geocoded_city = location_data['city']
            
            # Create locationString from geocoded city and country
            if geocoded_city and geocoded_country:
                locationString = f"{geocoded_city}, {geocoded_country}"
            elif geocoded_city:
                locationString = geocoded_city
            elif geocoded_country:
                locationString = geocoded_country
            else:
                locationString = location_str  # fallback to the original location_str
            
            # Create feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(final_lon), float(final_lat)]
                },
                "properties": {
                    "fakeId": msg_id,
                    "displayName": display_name,
                    "country": geocoded_country,
                    "city": geocoded_city,
                    "locationString": locationString,
                    "message": message,
                    "lat": float(final_lat),
                    "lng": float(final_lon),
                    "fan_name": display_name,
                    "timestamp": "2024-01-01T00:00:00.000Z",
                    "radius": 8,
                    # Add additional geocoding metadata
                    "place_name": geocode_result.get('place_name', ''),
                    "place_type": geocode_result.get('place_type', []),
                    "relevance": geocode_result.get('relevance', 0),
                    "original_query": location_str,
                    "has_random_offset": has_offset,
                    "original_lat": float(lat),
                    "original_lng": float(lon),
                    "has_zipcode": has_zipcode,
                    "randomization_radius_km": randomization_radius,
                    "randomized_due_to_no_zipcode": not has_zipcode
                }
            }
            
            geojson["features"].append(feature)
            msg_id += 1
    
    # Order messages by geographic proximity
    print("Ordering messages by geographic proximity...")
    ordered_features = order_messages_by_proximity(geojson['features'], cluster_radius_km=50.0)
    geojson['features'] = ordered_features
    
    # Save to GeoJSON file
    with open(OUTPUT_GEOJSON, 'w', encoding='utf-8') as outfile:
        json.dump(geojson, outfile, ensure_ascii=False, indent=2)
    
    save_cache(cache)
    
    # Calculate randomization statistics
    total_messages = len(geojson['features'])
    offset_count = sum(1 for feature in geojson['features'] if feature['properties'].get('has_random_offset', False))
    no_zipcode_count = sum(1 for feature in geojson['features'] if not feature['properties'].get('has_zipcode', True))
    
    print(f"Done! Output written to {OUTPUT_GEOJSON}")
    print(f"Total messages exported: {total_messages}")
    print(f"Messages with coordinate offsets: {offset_count} ({offset_count/total_messages*100:.1f}%)")
    print(f"Messages without zipcode (city-based): {no_zipcode_count} ({no_zipcode_count/total_messages*100:.1f}%)")
    print(f"Cache entries: {len(cache)}")
    print(f"Unique coordinates used: {len(used_coordinates)}")
    print(f"Messages ordered by geographic proximity (cluster radius: 50km)")

if __name__ == '__main__':
    main() 