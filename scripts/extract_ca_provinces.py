#!/usr/bin/env python3
import json
import sys
import math

def convert_web_mercator_to_wgs84(x, y):
    """Convert Web Mercator coordinates to WGS84 (longitude, latitude)"""
    lon = (x / 20037508.34) * 180
    lat = (math.atan(math.exp(y * math.pi / 20037508.34)) * 2 - math.pi / 2) * 180 / math.pi
    return [lon, lat]

def transform_geometry(geometry):
    """Transform geometry coordinates from Web Mercator to WGS84"""
    if geometry['type'] == 'Polygon':
        geometry['coordinates'] = [
            [convert_web_mercator_to_wgs84(x, y) for x, y in ring]
            for ring in geometry['coordinates']
        ]
    elif geometry['type'] == 'MultiPolygon':
        geometry['coordinates'] = [
            [
                [convert_web_mercator_to_wgs84(x, y) for x, y in ring]
                for ring in polygon
            ]
            for polygon in geometry['coordinates']
        ]
    return geometry

def extract_ca_provinces():
    """Extract British Columbia, Quebec, and Alberta data from Canada Provinces GeoJSON and convert coordinates"""
    
    # Read the source file
    with open('source/Canada_Provinc_FeaturesToJSO.geojson', 'r') as f:
        data = json.load(f)
    
    # Target provinces (using postal codes and English names) with counts
    target_provinces = {
        'BC': {'name': 'British Columbia', 'count': 57},  # Vancouver
        'QC': {'name': 'Quebec', 'count': 10},           # Montreal
        'AB': {'name': 'Alberta', 'count': 8},           # Calgary
        'ON': {'name': 'Ontario', 'count': 60}           # Toronto
    }
    
    # Filter features
    filtered_features = []
    for feature in data['features']:
        postal_code = feature['properties'].get('postal', '')
        name_en = feature['properties'].get('Name_EN', '')
        
        # Check if this province is in our target list
        province_info = None
        if postal_code in target_provinces:
            province_info = target_provinces[postal_code]
        elif name_en in [info['name'] for info in target_provinces.values()]:
            # Find the matching province info
            for code, info in target_provinces.items():
                if info['name'] == name_en:
                    province_info = info
                    break
        
        if province_info:
            # Transform the geometry coordinates
            feature['geometry'] = transform_geometry(feature['geometry'])
            # Add count to properties
            feature['properties']['count'] = province_info['count']
            filtered_features.append(feature)
            print(f"Found and transformed: {name_en} ({postal_code}) - Count: {province_info['count']}")
    
    # Create new GeoJSON with filtered features
    output_data = {
        "type": "FeatureCollection",
        "features": filtered_features
    }
    
    # Write to output file
    with open('docs/data/ca_provinces.geojson', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nExtracted and converted {len(filtered_features)} provinces to docs/data/ca_provinces_selected.geojson")
    
    # Test coordinate conversion with a sample
    if filtered_features:
        sample_feature = filtered_features[0]
        sample_coords = sample_feature['geometry']['coordinates'][0][0][:2] if sample_feature['geometry']['type'] == 'Polygon' else sample_feature['geometry']['coordinates'][0][0][0][:2]
        print(f"Sample converted coordinates for {sample_feature['properties']['Name_EN']}: {sample_coords}")
    
    # Print summary of extracted provinces
    print("\nExtracted provinces:")
    for feature in filtered_features:
        props = feature['properties']
        print(f"  - {props['Name_EN']} ({props['postal']}) - {props['Nom_Fr']}")

if __name__ == "__main__":
    extract_ca_provinces() 