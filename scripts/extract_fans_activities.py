import csv
import requests
import time
import json
import os
import random
import math
import html
from urllib.parse import quote
from datetime import datetime

# File paths
INPUT_CSV = 'source/fans_activities.csv'
OUTPUT_GEOJSON = 'docs/data/fans_activities.geojson'
CACHE_FILE = 'source/fans_activities_geocode_cache.json'
PHOTOS_DIR = 'docs/img/activities'

# Mapbox API token (replace with your actual token)
MAPBOX_TOKEN = 'pk.eyJ1IjoianVzdGFub3RoZXJtaSIsImEiOiJjbWFwMmU1ZnkwZHJ6MmxwdnloemZhY3I0In0.TiHvo3M3CHK0ciLiNC77iQ'

# Column names from the CSV
ID_COL = 'ID'
CATEGORY_COL = 'Category'
DATE_COL = '时间'
CITY_COL = 'City/地方群名'
LOCATION_COL = '团建地点_具体位置'
COORDINATES_COL = 'Location (Lat/Lng)'
THEME_COL = '主题_Theme'
TITLE_COL = '标题_Title Display'
AUTHOR_COL = 'Author (Cr)'
FORMAT_COL = 'Format'
VIDEO_LINK_COL = '视频_link'
BILIBILI_LINK_COL = 'Bilibili Link'
PHOTO_LINK_COL = '照片_link'
PHOTO_NAMES_COL = 'Photo Names'
NOTES_COL = 'Notes'

# Load or initialize geocode cache
def load_cache():
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
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

def parse_coordinates(coord_str):
    """Parse coordinates from string format like '47.627048123729324, -122.33719416881918'"""
    if not coord_str or coord_str.strip() == '':
        return None, None
    
    try:
        # Remove any extra whitespace and split by comma
        parts = coord_str.strip().split(',')
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            return lat, lng
    except (ValueError, IndexError):
        pass
    
    return None, None

def add_random_offset(lat, lon, radius_km=1.0):
    """Add a random offset within the specified radius (in km) from the given coordinates."""
    # Convert radius from km to degrees (approximate)
    lat_rad = math.radians(lat)
    lat_degree_km = 111.0
    lon_degree_km = 111.0 * math.cos(lat_rad)
    
    # Generate random angle and distance
    angle = random.uniform(0, 2 * math.pi)
    distance_ratio = math.sqrt(random.uniform(0, 1))
    distance_km = distance_ratio * radius_km
    
    # Calculate offset in degrees
    lat_offset = (distance_km * math.cos(angle)) / lat_degree_km
    lon_offset = (distance_km * math.sin(angle)) / lon_degree_km
    
    return lat + lat_offset, lon + lon_offset

def find_unique_coordinates(lat, lon, used_coordinates, radius_km=2.0, max_attempts=50):
    """Find unique coordinates by applying systematic offsets when the original coordinates are already used."""
    precision = 5
    base_lat = round(lat, precision)
    base_lon = round(lon, precision)
    
    # Check if base coordinates are available
    if (base_lat, base_lon) not in used_coordinates:
        used_coordinates.add((base_lat, base_lon))
        return lat, lon, False
    
    # Try systematic positions in concentric circles
    for attempt in range(1, max_attempts + 1):
        angle = attempt * 2.39996322972865332  # golden angle in radians
        
        if attempt <= max_attempts // 3:
            distance_ratio = (attempt / (max_attempts // 3)) * 0.33
        elif attempt <= 2 * max_attempts // 3:
            distance_ratio = 0.33 + ((attempt - max_attempts // 3) / (max_attempts // 3)) * 0.33
        else:
            distance_ratio = 0.66 + ((attempt - 2 * max_attempts // 3) / (max_attempts // 3)) * 0.34
        
        distance_km = distance_ratio * radius_km
        
        # Calculate offset in degrees
        lat_rad = math.radians(lat)
        lat_degree_km = 111.0
        lon_degree_km = 111.0 * math.cos(lat_rad)
        
        lat_offset = (distance_km * math.cos(angle)) / lat_degree_km
        lon_offset = (distance_km * math.sin(angle)) / lon_degree_km
        
        new_lat = lat + lat_offset
        new_lon = lon + lon_offset
        
        rounded_lat = round(new_lat, precision)
        rounded_lon = round(new_lon, precision)
        
        if (rounded_lat, rounded_lon) not in used_coordinates:
            used_coordinates.add((rounded_lat, rounded_lon))
            return new_lat, new_lon, True
    
    # If all attempts failed, use random offset
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

def parse_date(date_str):
    """Parse date string and return ISO format"""
    if not date_str or date_str.strip() == '':
        return "2024-01-01T00:00:00.000Z"
    
    try:
        # Handle different date formats
        date_str = date_str.strip()
        
        # Handle "团建" as a special case
        if date_str == "团建":
            return "2024-01-01T00:00:00.000Z"
        
        if '/' in date_str:
            # Format: 2024/4/6 or 2024/04/06 or 2025/04/27
            parts = date_str.split('/')
            if len(parts) == 3:
                year = parts[0]
                month = parts[1].zfill(2)
                day = parts[2].zfill(2)
                return f"{year}-{month}-{day}T00:00:00.000Z"
    except:
        pass
    
    return "2024-01-01T00:00:00.000Z"

def verify_photo_files(photo_names_str, activity_id, city):
    """Verify that photo files exist in the activities directory and log missing ones"""
    if not photo_names_str or photo_names_str.strip() == '':
        return [], []
    
    missing_photos = []
    existing_photos = []
    
    # Split photo names by common delimiters (comma, semicolon, newline)
    photo_names = []
    for delimiter in [',', ';', '\n']:
        if delimiter in photo_names_str:
            photo_names = [name.strip() for name in photo_names_str.split(delimiter) if name.strip()]
            break
    
    # If no delimiter found, treat as single photo name
    if not photo_names:
        photo_names = [photo_names_str.strip()]
    
    for photo_name in photo_names:
        # Clean up the photo name
        photo_name = photo_name.strip()
        if not photo_name:
            continue
        
        # Add .jpg extension if not present
        if not photo_name.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
            photo_name += '.jpg'
        
        # Check if file exists
        photo_path = os.path.join(PHOTOS_DIR, photo_name)
        if os.path.exists(photo_path):
            existing_photos.append(photo_name)
        else:
            missing_photos.append(photo_name)
            print(f"WARNING: Missing photo file '{photo_name}' for activity {activity_id} in {city}")
    
    return existing_photos, missing_photos

def filter_video_links(video_link, bilibili_link):
    """
    Filter video links to extract YouTube and Bilibili URLs while ignoring Google Drive links.
    Returns youtube_url and bilibili_url.
    """
    youtube_url = ""
    bilibili_url = ""
    
    # Process video_link column
    if video_link and video_link.strip():
        link = video_link.strip()
        # Check if it's a Google Drive link and skip it
        if 'drive.google.com' in link or 'docs.google.com' in link:
            pass  # Ignore Google Drive links
        elif 'youtube.com' in link or 'youtu.be' in link:
            youtube_url = link
        elif 'bilibili.com' in link:
            bilibili_url = link
    
    # Process bilibili_link column
    if bilibili_link and bilibili_link.strip():
        link = bilibili_link.strip()
        # Check if it's a Google Drive link and skip it
        if 'drive.google.com' in link or 'docs.google.com' in link:
            pass  # Ignore Google Drive links
        elif 'youtube.com' in link or 'youtu.be' in link:
            # Only set if not already set from video_link
            if not youtube_url:
                youtube_url = link
        elif 'bilibili.com' in link:
            # Only set if not already set from video_link
            if not bilibili_url:
                bilibili_url = link
    
    return youtube_url, bilibili_url

def main():
    cache = load_cache()
    used_coordinates = set()
    
    # Initialize GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    # Statistics for photo verification
    total_photos_checked = 0
    total_missing_photos = 0
    activities_with_photos = 0
    activities_with_missing_photos = 0
    
    # First pass: collect all activities
    activities = []
    
    with open(INPUT_CSV, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        for row in reader:
            # Extract basic information
            activity_id_str = row.get(ID_COL, '').strip()
            category = row.get(CATEGORY_COL, '').strip()
            date_str = row.get(DATE_COL, '').strip()
            city = row.get(CITY_COL, '').strip()
            location = row.get(LOCATION_COL, '').strip()
            coordinates_str = row.get(COORDINATES_COL, '').strip()
            photo_names = row.get(PHOTO_NAMES_COL, '').strip()
            theme = row.get(THEME_COL, '').strip()
            title = row.get(TITLE_COL, '').strip()
            author = row.get(AUTHOR_COL, '').strip()
            format_type = row.get(FORMAT_COL, '').strip()
            video_link = row.get(VIDEO_LINK_COL, '').strip()
            bilibili_link = row.get(BILIBILI_LINK_COL, '').strip()
            photo_link = row.get(PHOTO_LINK_COL, '').strip()
            notes = row.get(NOTES_COL, '').strip()
            
            # Filter video links to extract YouTube and Bilibili URLs
            youtube_url, bilibili_url = filter_video_links(video_link, bilibili_link)
            
            # Skip if no ID or category
            if not activity_id_str or not category:
                continue
            
            # Verify photo files if photo names are provided
            existing_photos = []
            missing_photos = []
            if photo_names:
                existing_photos, missing_photos = verify_photo_files(photo_names, activity_id_str, city)
                total_photos_checked += len(existing_photos) + len(missing_photos)
                total_missing_photos += len(missing_photos)
                if existing_photos:
                    activities_with_photos += 1
                if missing_photos:
                    activities_with_missing_photos += 1
            
            # Try to get coordinates from the CSV first
            lat, lng = parse_coordinates(coordinates_str)
            location_data = None
            
            if lat is not None and lng is not None:
                # Use provided coordinates
                location_data = {
                    'city': city,
                    'country': '',
                    'locationString': city
                }
            else:
                # Try to geocode the location
                location_query = location if location else city
                if location_query:
                    geocode_result = geocode(location_query, cache)
                    if geocode_result:
                        lng, lat = geocode_result['center']
                        location_data = extract_location_data(geocode_result)
                    else:
                        # Skip if geocoding failed
                        print(f"WARNING: Could not geocode location for activity {activity_id_str} in {city}")
                        continue
                else:
                    # Skip if no location information
                    print(f"WARNING: No location information for activity {activity_id_str} in {city}")
                    continue
            
            # Find unique coordinates
            final_lat, final_lng, has_offset = find_unique_coordinates(lat, lng, used_coordinates)
            
            # Create display title
            display_title = title if title else theme if theme else f"{category} - {city}"
            
            # Create description
            display_description = theme if theme else f"{category} activity in {city}"
            
            # Create feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(final_lng), float(final_lat)]
                },
                "properties": {
                    "activityId": activity_id_str,
                    "displayName": escape_html(display_title),
                    "category": escape_html(category),
                    "city": city,
                    "locationString": location_data['locationString'],
                    "description": escape_html(display_description),
                    "lat": float(final_lat),
                    "lng": float(final_lng),
                    "timestamp": parse_date(date_str),
                    "radius": 10,
                    "youtube_url": youtube_url,
                    "bilibili_url": bilibili_url,
                    "photo_link": photo_link,
                    "photo_names": photo_names,
                    "existing_photos": existing_photos,
                    "missing_photos": missing_photos,
                    "original_location": escape_html(location),
                    "original_coordinates": coordinates_str,
                    "has_random_offset": has_offset,
                    "geocoded_lat": float(lat),
                    "geocoded_lng": float(lng),
                    "author": escape_html(author),
                    "format_type": escape_html(format_type),
                    "notes": escape_html(notes)
                }
            }
            
            activities.append(feature)
    

    
    # Sort activities by location, then by date within each location
    activities.sort(key=lambda x: (
        x['properties']['city'],            # Sort by city first (more consistent than locationString)
        x['properties']['timestamp']        # Then by date within each location
    ))
    
    # Add sorted activities to GeoJSON with sequential fakeId
    for i, activity in enumerate(activities, 1):
        activity['properties']['fakeId'] = i
        geojson["features"].append(activity)
    
    # Save to GeoJSON file
    with open(OUTPUT_GEOJSON, 'w', encoding='utf-8') as outfile:
        json.dump(geojson, outfile, ensure_ascii=False, indent=2)
    
    save_cache(cache)
    
    # Calculate statistics
    total_activities = len(geojson['features'])
    offset_count = sum(1 for feature in geojson['features'] if feature['properties'].get('has_random_offset', False))
    activities_with_coordinates = sum(1 for feature in geojson['features'] if feature['properties'].get('original_coordinates', '').strip())
    
    print(f"Done! Output written to {OUTPUT_GEOJSON}")
    print(f"Total activities exported: {total_activities}")
    print(f"Activities with provided coordinates: {activities_with_coordinates} ({activities_with_coordinates/total_activities*100:.1f}%)")
    print(f"Activities with coordinate offsets: {offset_count} ({offset_count/total_activities*100:.1f}%)")
    print(f"Cache entries: {len(cache)}")
    print(f"Unique coordinates used: {len(used_coordinates)}")
    
    # Photo verification statistics
    print(f"\nPhoto verification results:")
    print(f"Total photos checked: {total_photos_checked}")
    print(f"Missing photos: {total_missing_photos}")
    print(f"Activities with photos: {activities_with_photos}")
    print(f"Activities with missing photos: {activities_with_missing_photos}")
    if total_photos_checked > 0:
        print(f"Photo availability rate: {(total_photos_checked - total_missing_photos)/total_photos_checked*100:.1f}%")

if __name__ == '__main__':
    main() 