#!/usr/bin/env python3
"""
Utility function to extract messages from CSV file and organize them by city
into separate message wall JSON files for Las Vegas, Seattle, Toronto, and New York.
Uses geocoded location data for better standardization.
"""

import csv
import json
import os
import html
from typing import Dict, List, Any

def escape_html(text):
    """Escape HTML special characters to prevent XSS and rendering issues"""
    if not text:
        return text
    return html.escape(text, quote=False)

def load_geocoded_data():
    """Load geocoded location data from the geojson file"""
    geocoded_file = "docs/data/messages_geocoded.geojson"
    geocoded_locations = {}
    
    if os.path.exists(geocoded_file):
        with open(geocoded_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            display_name = properties.get('displayName', '')
            message = properties.get('message', '')
            
            # Create a key based on display name and message to match with CSV data
            key = f"{display_name}|{message}"
            geocoded_locations[key] = {
                'place_name': properties.get('place_name', ''),
                'city': properties.get('city', ''),
                'country': properties.get('country', ''),
                'locationString': properties.get('locationString', '')
            }
    
    return geocoded_locations

def extract_messages():
    # Load geocoded location data
    geocoded_locations = load_geocoded_data()
    print(f"Loaded {len(geocoded_locations)} geocoded location entries")
    
    # Define the cities we're looking for
    # World Tour cities (国际巡演)
    world_tour_cities = {
        "伦敦 London": "london_message_wall.json",
        "拉斯维加斯 Las Vegas": "las_vegas_message_wall.json",
        "多伦多 Toronto": "toronto_message_wall.json", 
        "纽约 New York": "new_york_message_wall.json",
        "西雅图 Seattle": "seattle_message_wall.json",
        "墨尔本 Melbourne": "melbourne_message_wall.json",
        "悉尼 Sydney": "sydney_message_wall.json",
        "吉隆坡 Kuala Lumpur": "kuala_lumpur_message_wall.json"
    }
    
    # National Tour cities (国内巡演)
    national_tour_cities = {
        "上海 Shanghai": "shanghai_message_wall.json",
        "深圳 Shenzhen": "shenzhen_message_wall.json",
        "成都 Chengdu": "chengdu_message_wall.json",
        "贵阳 Guiyang": "guiyang_message_wall.json",
        "武汉 Wuhan": "wuhan_message_wall.json",
        "南京 Nanjing": "nanjing_message_wall.json",
        "杭州 Hangzhou": "hangzhou_message_wall.json",
        "沈阳 Shenyang": "shenyang_message_wall.json",
        "北京 Beijing": "beijing_message_wall.json",
        "重庆 Chongqing": "chongqing_message_wall.json",
        "苏州 Suzhou": "suzhou_message_wall.json",
        "南昌 Nanchang": "nanchang_message_wall.json",
        "南宁 Nanning": "nanning_message_wall.json"
    }
    
    # Combine all cities for processing
    all_cities = {**world_tour_cities, **national_tour_cities}
    
    # Read the CSV file
    csv_file = "source/messages.csv"
    extracted_messages = {city: [] for city in all_cities.keys()}
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)  # Skip header row
        
        # Find the relevant column indices
        world_tour_concert_cols = []
        national_tour_concert_cols = []
        message_cols = []
        display_name_col = None
        country_col = None
        city_col = None
        
        for i, header in enumerate(headers):
            if "请选择您想留言的9.29Hz世界巡演场次" in header:
                world_tour_concert_cols.append(i)
            elif "请选择您想留言的9.29Hz国内巡演场次" in header:
                national_tour_concert_cols.append(i)
            elif "您的留言" in header:
                message_cols.append(i)
            elif "您希望在地图上展示的名字" in header:
                display_name_col = i
            elif "您所在的国家" in header:
                country_col = i
            elif "您所在的城市" in header:
                city_col = i
        
        print(f"Found {len(world_tour_concert_cols)} world tour concert columns and {len(national_tour_concert_cols)} national tour concert columns")
        print(f"Found {len(message_cols)} message columns")
        print(f"Display name column: {display_name_col}")
        print(f"Country column: {country_col}")
        print(f"City column: {city_col}")
        
        # Process each row
        for row_num, row in enumerate(reader, start=2):
            if len(row) < max(world_tour_concert_cols + national_tour_concert_cols + message_cols + [display_name_col, country_col, city_col]):
                continue
                
            display_name = escape_html(row[display_name_col] if display_name_col is not None and display_name_col < len(row) else "Anonymous")
            country = row[country_col] if country_col is not None and country_col < len(row) else ""
            user_city = row[city_col] if city_col is not None and city_col < len(row) else ""
            
            # Process World Tour concert/message pairs
            for i, (concert_col, message_col) in enumerate(zip(world_tour_concert_cols, message_cols[:len(world_tour_concert_cols)])):
                if concert_col >= len(row) or message_col >= len(row):
                    continue
                    
                concert = row[concert_col].strip()
                message = escape_html(row[message_col].strip())
                
                # Skip if no concert or message
                if not concert or not message or concert == "无 None":
                    continue
                
                # Check if this concert is one of our target world tour cities
                for target_city in world_tour_cities.keys():
                    if target_city in concert:
                        # Try to find geocoded location data
                        key = f"{display_name}|{message}"
                        geocoded_data = geocoded_locations.get(key)
                        
                        if geocoded_data:
                            # Use geocoded location data
                            location = geocoded_data['locationString']
                        else:
                            # Fallback to original logic
                            location = f"{user_city}, {country}" if user_city and country else country or user_city or "Unknown"
                        
                        # Add to extracted messages
                        extracted_messages[target_city].append({
                            "from": display_name,
                            "location": location,
                            "country": geocoded_data.get('country', '') if geocoded_data else country,
                            "message": message
                        })
                        break
            
            # Process National Tour concert/message pairs
            for i, (concert_col, message_col) in enumerate(zip(national_tour_concert_cols, message_cols[len(world_tour_concert_cols):len(world_tour_concert_cols)+len(national_tour_concert_cols)])):
                if concert_col >= len(row) or message_col >= len(row):
                    continue
                    
                concert = row[concert_col].strip()
                message = escape_html(row[message_col].strip())
                
                # Skip if no concert or message
                if not concert or not message or concert == "无 None":
                    continue
                
                # Check if this concert is one of our target national tour cities
                for target_city in national_tour_cities.keys():
                    if target_city in concert:
                        # Try to find geocoded location data
                        key = f"{display_name}|{message}"
                        geocoded_data = geocoded_locations.get(key)
                        
                        if geocoded_data:
                            # Use geocoded location data
                            location = geocoded_data['locationString']
                        else:
                            # Fallback to original logic
                            location = f"{user_city}, {country}" if user_city and country else country or user_city or "Unknown"
                        
                        # Add to extracted messages
                        extracted_messages[target_city].append({
                            "from": display_name,
                            "location": location,
                            "country": geocoded_data.get('country', '') if geocoded_data else country,
                            "message": message
                        })
                        break
    
    # Replace the JSON files entirely
    for city, filename in all_cities.items():
        filepath = f"docs/data/{filename}"
        
        # Create new data structure with only the extracted messages
        data = {"messages": extracted_messages[city]}
        
        # Save the file, completely replacing any existing content
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Replaced {filename} with {len(extracted_messages[city])} messages")

def main():
    """Main function to run the extraction."""
    print("Extracting messages from CSV with geocoded location data...")
    extract_messages()
    
    print("Done!")

if __name__ == "__main__":
    main() 