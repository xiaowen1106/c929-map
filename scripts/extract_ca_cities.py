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

def extract_ca_cities():
    """Extract Vancouver, Toronto, and Calgary data from Canada CMA GeoJSON and convert coordinates"""
    
    # Read the source file
    with open('source/Canada CMA Bou_FeaturesToJSO.geojson', 'r') as f:
        data = json.load(f)
    
    # Cities to extract (exact matches and variations)
    target_cities = ['Calgary', 'Toronto', 'Vancouver', 'Montréal']
    
    # Filter features
    filtered_features = []
    for feature in data['features']:
        cm_name = feature['properties'].get('CMANAME', '')
        if cm_name in target_cities:
            # Transform the geometry coordinates
            feature['geometry'] = transform_geometry(feature['geometry'])
            filtered_features.append(feature)
            print(f"Found and transformed: {cm_name}")
    
    # Create new GeoJSON with filtered features
    output_data = {
        "type": "FeatureCollection",
        "features": filtered_features
    }
    
    # Write to output file
    with open('docs/data/ca_cma.geojson', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nExtracted and converted {len(filtered_features)} cities to docs/data/ca_cma.geojson")
    
    # Test coordinate conversion with a sample
    if filtered_features:
        sample_feature = filtered_features[0]
        sample_coords = sample_feature['geometry']['coordinates'][0][0][:2] if sample_feature['geometry']['type'] == 'Polygon' else sample_feature['geometry']['coordinates'][0][0][0][:2]
        print(f"Sample converted coordinates for {sample_feature['properties']['CMANAME']}: {sample_coords}")

if __name__ == "__main__":
    extract_ca_cities() 