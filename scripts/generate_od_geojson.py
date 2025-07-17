import csv
import requests
import time
import hashlib
import os
import json
import math
from urllib.parse import quote

# File paths
INPUT_CSV = 'source/messages.csv'
OUTPUT_GEOJSON = 'docs/data/flying_tracking.geojson'
VENUES_GEOJSON = 'docs/data/929_venues.geojson'
CACHE_FILE = 'source/geocode_cache.json'

# Mapbox API token (replace with your actual token)
MAPBOX_TOKEN = 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFwMmU1ZnkwZHJ6MmxwdnloemZhY3I0In0.TiHvo3M3CHK0ciLiNC77iQ'

# Column names (as in the CSV header)
DISPLAY_NAME_COL = '您希望在地图上展示的名字 Your Display Name on the Map'
WORLD_TOUR_COL = '您参与的周深9.29Hz世界巡演场次 Which 9.29Hz World Tour concert(s) did you attend?'
NATIONAL_TOUR_COL = '您参与的周深9.29Hz国内巡演场次 Which 2024 9.29Hz National Tour concert(s) did you attend?'
ZIP_COL = '【选填 Optional】您的邮编代码 Your ZIP Code'
COUNTRY_COL = '您所在的国家 Which country are you in?'
CITY_COL = '您所在的城市 Which city are you in?'

def calculate_shortest_path(origin: tuple, destination: tuple) -> tuple:
    """
    Calculate the shortest path between two points considering the Earth's curvature.
    
    Args:
        origin: (longitude, latitude) of origin point
        destination: (longitude, latitude) of destination point
    
    Returns:
        Tuple of (longitude, latitude) representing the shortest path destination
    """
    o_lng, o_lat = origin
    d_lng, d_lat = destination
    
    # Calculate the difference in longitude
    lng_diff = d_lng - o_lng
    
    # Handle cases where the path crosses the 180/-180 meridian
    if lng_diff > 180:
        lng_diff -= 360
    elif lng_diff < -180:
        lng_diff += 360
    
    # If the absolute longitude difference is greater than 180 degrees,
    # the shorter path goes the other way around the globe
    if abs(lng_diff) > 180:
        # Take the longer route but in the opposite direction
        if lng_diff > 0:
            lng_diff -= 360
        else:
            lng_diff += 360
    
    # Calculate the destination longitude for the shortest path
    shortest_dest_lng = o_lng + lng_diff
    
    return (shortest_dest_lng, d_lat)

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

def load_venues():
    """Load venue data from the venues GeoJSON file"""
    venues = {}
    with open(VENUES_GEOJSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for feature in data['features']:
            props = feature['properties']
            city = props.get('city', '')
            if city:
                venues[city] = {
                    'id': props.get('id', ''),
                    'title': props.get('title', ''),
                    'venue': props.get('venue', ''),
                    'date': props.get('date', ''),
                    'coordinates': feature['geometry']['coordinates'],
                    'address': props.get('address', '')
                }
    return venues

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

def parse_concert_list(concert_str):
    """Parse the concert string to extract individual concert cities"""
    if not concert_str or concert_str.strip() == '' or concert_str.strip() == '无 None':
        return []
    
    # Split by common delimiters
    concerts = []
    for delimiter in [', ', '，', '、']:
        if delimiter in concert_str:
            concerts = [c.strip() for c in concert_str.split(delimiter)]
            break
    
    # If no delimiter found, treat as single concert
    if not concerts:
        concerts = [concert_str.strip()]
    
    # Clean up the concert names
    cleaned_concerts = []
    for concert in concerts:
        # Remove common prefixes/suffixes
        concert = concert.replace('拉斯维加斯 Las Vegas', 'Las Vegas')
        concert = concert.replace('西雅图 Seattle', 'Seattle')
        concert = concert.replace('纽约 New York', 'New York')
        concert = concert.replace('多伦多 Toronto', 'Toronto')
        concert = concert.replace('伦敦 London', 'London')
        concert = concert.replace('墨尔本 Melbourne', 'Melbourne')
        concert = concert.replace('悉尼 Sydney', 'Sydney')
        concert = concert.replace('吉隆坡 Kuala Lumpur', 'Kuala Lumpur')
        concert = concert.replace('上海 Shanghai', 'Shanghai')
        concert = concert.replace('深圳 Shenzhen', 'Shenzhen')
        concert = concert.replace('成都 Chengdu', 'Chengdu')
        concert = concert.replace('贵阳 Guiyang', 'Guiyang')
        concert = concert.replace('武汉 Wuhan', 'Wuhan')
        concert = concert.replace('南京 Nanjing', 'Nanjing')
        concert = concert.replace('杭州 Hangzhou', 'Hangzhou')
        concert = concert.replace('沈阳 Shenyang', 'Shenyang')
        concert = concert.replace('北京 Beijing', 'Beijing')
        concert = concert.replace('重庆 Chongqing', 'Chongqing')
        concert = concert.replace('苏州 Suzhou', 'Suzhou')
        concert = concert.replace('南昌 Nanchang', 'Nanchang')
        concert = concert.replace('南宁 Nanning', 'Nanning')
        
        if concert and concert != '无' and concert != 'None':
            cleaned_concerts.append(concert)
    
    return cleaned_concerts

def get_city_names(concert_city):
    """Get Chinese and English city names for the destination"""
    city_mapping = {
        'Las Vegas': {'chi': '拉斯维加斯', 'eng': 'Las Vegas'},
        'Seattle': {'chi': '西雅图', 'eng': 'Seattle'},
        'New York': {'chi': '纽约', 'eng': 'New York'},
        'Toronto': {'chi': '多伦多', 'eng': 'Toronto'},
        'London': {'chi': '伦敦', 'eng': 'London'},
        'Melbourne': {'chi': '墨尔本', 'eng': 'Melbourne'},
        'Sydney': {'chi': '悉尼', 'eng': 'Sydney'},
        'Kuala Lumpur': {'chi': '吉隆坡', 'eng': 'Kuala Lumpur'},
        'Shanghai': {'chi': '上海', 'eng': 'Shanghai'},
        'Shenzhen': {'chi': '深圳', 'eng': 'Shenzhen'},
        'Chengdu': {'chi': '成都', 'eng': 'Chengdu'},
        'Guiyang': {'chi': '贵阳', 'eng': 'Guiyang'},
        'Wuhan': {'chi': '武汉', 'eng': 'Wuhan'},
        'Nanjing': {'chi': '南京', 'eng': 'Nanjing'},
        'Hangzhou': {'chi': '杭州', 'eng': 'Hangzhou'},
        'Shenyang': {'chi': '沈阳', 'eng': 'Shenyang'},
        'Beijing': {'chi': '北京', 'eng': 'Beijing'},
        'Chongqing': {'chi': '重庆', 'eng': 'Chongqing'},
        'Suzhou': {'chi': '苏州', 'eng': 'Suzhou'},
        'Nanchang': {'chi': '南昌', 'eng': 'Nanchang'},
        'Nanning': {'chi': '南宁', 'eng': 'Nanning'}
    }
    
    return city_mapping.get(concert_city, {'chi': concert_city, 'eng': concert_city})

def is_north_america_destination(city_english):
    """Check if the destination is in North America"""
    north_america_cities = {
        'Las Vegas', 'Seattle', 'New York', 'Toronto'
    }
    return city_english in north_america_cities

def sort_features_by_destination(geojson):
    """Sort features so that North American destinations appear later"""
    def sort_key(feature):
        # Get the destination city from the feature
        dest_city = feature['properties']['destination']['cityEnglish']
        # Return 1 for North America (to sort later), 0 for others (to sort earlier)
        return 1 if is_north_america_destination(dest_city) else 0
    
    geojson['features'].sort(key=sort_key)
    return geojson

def main():
    cache = load_cache()
    venues = load_venues()
    
    # Initialize GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    with open(INPUT_CSV, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        fake_id = 1
        
        for row in reader:
            display_name = row.get(DISPLAY_NAME_COL, '').strip()
            world_tour = row.get(WORLD_TOUR_COL, '').strip()
            national_tour = row.get(NATIONAL_TOUR_COL, '').strip()
            zip_code = row.get(ZIP_COL, '').strip()
            country = row.get(COUNTRY_COL, '').strip()
            city = row.get(CITY_COL, '').strip()
            
            # Skip if no display name
            if not display_name:
                continue
                
            # Create query string for geocoding origin location
            if zip_code:
                origin_location_str = f"{zip_code}, {country}" if country else zip_code
            else:
                origin_location_str = f"{city}, {country}" if city and country else city or country
                
            if not origin_location_str:
                continue
                
            # Geocode the origin location
            origin_geocode_result = geocode(origin_location_str, cache)
            
            # Skip if geocoding failed
            if not origin_geocode_result:
                continue
                
            # Extract coordinates from the origin feature
            origin_lon, origin_lat = origin_geocode_result['center']
            
            # Extract location data from the response
            origin_location_data = extract_location_data(origin_geocode_result)
            
            # Parse concert lists
            world_concerts = parse_concert_list(world_tour)
            national_concerts = parse_concert_list(national_tour)
            
            # Create OD features for world tour concerts
            for concert_city in world_concerts:
                if concert_city in venues:
                    venue = venues[concert_city]
                    dest_lon, dest_lat = venue['coordinates']
                    
                    # Calculate shortest path
                    shortest_dest = calculate_shortest_path((origin_lon, origin_lat), (dest_lon, dest_lat))
                    
                    # Get city names
                    city_names = get_city_names(concert_city)
                    
                    # Create feature
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [origin_lon, origin_lat],
                                [shortest_dest[0], shortest_dest[1]]
                            ]
                        },
                        "properties": {
                            "id": f"{fake_id}-{venue['id']}",
                            "fakeId": str(fake_id),
                            "displayName": display_name,
                            "origin": {
                                "country": origin_location_data['country'],
                                "city": origin_location_data['city'],
                                "zipCode": zip_code,
                                "coordinates": [origin_lon, origin_lat]
                            },
                            "destination": {
                                "venue": f"{city_names['chi']} {city_names['eng']}",
                                "cityChi": city_names['chi'],
                                "cityEnglish": city_names['eng'],
                                "cityId": venue['id'],
                                "coordinates": [dest_lon, dest_lat]
                            },
                            "type": "od_track",
                            "shortestPath": True
                        }
                    }
                    
                    geojson["features"].append(feature)
            
            # Create OD features for national tour concerts
            for concert_city in national_concerts:
                if concert_city in venues:
                    venue = venues[concert_city]
                    dest_lon, dest_lat = venue['coordinates']
                    
                    # Calculate shortest path
                    shortest_dest = calculate_shortest_path((origin_lon, origin_lat), (dest_lon, dest_lat))
                    
                    # Get city names
                    city_names = get_city_names(concert_city)
                    
                    # Create feature
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [origin_lon, origin_lat],
                                [shortest_dest[0], shortest_dest[1]]
                            ]
                        },
                        "properties": {
                            "id": f"{fake_id}-{venue['id']}",
                            "fakeId": str(fake_id),
                            "displayName": display_name,
                            "origin": {
                                "country": origin_location_data['country'],
                                "city": origin_location_data['city'],
                                "zipCode": zip_code,
                                "coordinates": [origin_lon, origin_lat]
                            },
                            "destination": {
                                "venue": f"{city_names['chi']} {city_names['eng']}",
                                "cityChi": city_names['chi'],
                                "cityEnglish": city_names['eng'],
                                "cityId": venue['id'],
                                "coordinates": [dest_lon, dest_lat]
                            },
                            "type": "od_track",
                            "shortestPath": True
                        }
                    }
                    
                    geojson["features"].append(feature)
            
            fake_id += 1
    
    # Sort features by destination
    sorted_geojson = sort_features_by_destination(geojson)
    
    # Save to GeoJSON file
    with open(OUTPUT_GEOJSON, 'w', encoding='utf-8') as outfile:
        json.dump(sorted_geojson, outfile, ensure_ascii=False, indent=2)
    
    save_cache(cache)
    print(f"Done! Output written to {OUTPUT_GEOJSON}")
    print(f"Total OD connections exported: {len(sorted_geojson['features'])}")
    print(f"Cache entries: {len(cache)}")

if __name__ == '__main__':
    main() 