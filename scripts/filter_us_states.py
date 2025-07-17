#!/usr/bin/env python3
"""
Script to download and filter us_states.geojson from Mapbox to keep only specific states.
Also merges DC, Maryland, and Virginia into a single DMV feature.
"""

import json
import urllib.request
import os
from shapely.geometry import Polygon, MultiPolygon, shape, mapping
from shapely.ops import unary_union

# States to keep
STATES_TO_KEEP = [
    'Texas',
    'New York', 
    'New Jersey',
    'District of Columbia',
    'Maryland',
    'Virginia',
    'Massachusetts',
    'Washington',
    'Florida',
    'California',
    'Iowa',
    'Georgia',
    'Pennsylvania',
    'Illinois',
    'Missouri',
    'Wisconsin',
    'Minnesota',
    'Michigan',
    'Indiana',
    'Ohio'
]

# Count values for each state
STATE_COUNTS = {
    'Texas': 40,
    'New York': 0,  # Will be merged into NY/NJ
    'New Jersey': 0,  # Will be merged into NY/NJ
    'District of Columbia': 0,  # Will be merged into DMV
    'Maryland': 0,  # Will be merged into DMV
    'Virginia': 0,  # Will be merged into DMV
    'Massachusetts': 232,
    'Washington': 79,
    'Florida': 14,
    'California': 187,
    'Iowa': 7,
    'Georgia': 6,
    'Pennsylvania': 5,
    'Illinois': 12,
    'Missouri': 4,
    'Wisconsin': 3,
    'Minnesota': 3,
    'Michigan': 3,
    'Indiana': 3,
    'Ohio': 12
}

# Special count for merged DMV feature
DMV_TOTAL_COUNT = 29

# Special count for merged NY/NJ feature
NY_NJ_TOTAL_COUNT = 119

def download_us_states():
    """Download us_states.geojson from Mapbox."""
    url = 'https://docs.mapbox.com/mapbox-gl-js/assets/us_states.geojson'
    print(f"Downloading US states data from: {url}")
    
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Error downloading data: {e}")
        return None

def merge_dmv_states(features):
    """Merge DC, Maryland, and Virginia into a single DMV feature."""
    dmv_states = ['District of Columbia', 'Maryland', 'Virginia']
    dmv_features = []
    other_features = []
    
    for feature in features:
        state_name = feature['properties']['STATE_NAME']
        if state_name in dmv_states:
            dmv_features.append(feature)
            print(f"Adding to DMV: {state_name}")
        else:
            other_features.append(feature)
    
    if dmv_features:
        # Merge geometries
        geometries = []
        for feature in dmv_features:
            geom = shape(feature['geometry'])
            geometries.append(geom)
        
        # Union all DMV geometries
        merged_geometry = unary_union(geometries)
        
        # Create new DMV feature
        dmv_feature = {
            'type': 'Feature',
            'properties': {
                'STATE_NAME': 'DMV',
                'STATE_FIPS': 'DMV',
                'STATE_ABBR': 'DMV',
                'count': DMV_TOTAL_COUNT
            },
            'geometry': mapping(merged_geometry)
        }
        
        print(f"Created merged DMV feature from {len(dmv_features)} states with total count: {DMV_TOTAL_COUNT}")
        return [dmv_feature] + other_features
    
    return features

def merge_ny_nj_states(features):
    """Merge New York and New Jersey into a single NY/NJ feature."""
    ny_nj_states = ['New York', 'New Jersey']
    ny_nj_features = []
    other_features = []
    
    for feature in features:
        state_name = feature['properties']['STATE_NAME']
        if state_name in ny_nj_states:
            ny_nj_features.append(feature)
            print(f"Adding to NY/NJ: {state_name}")
        else:
            other_features.append(feature)
    
    if ny_nj_features:
        # Merge geometries
        geometries = []
        for feature in ny_nj_features:
            geom = shape(feature['geometry'])
            geometries.append(geom)
        
        # Union all NY/NJ geometries
        merged_geometry = unary_union(geometries)
        
        # Create new NY/NJ feature
        ny_nj_feature = {
            'type': 'Feature',
            'properties': {
                'STATE_NAME': 'NY/NJ',
                'STATE_FIPS': 'NY/NJ',
                'STATE_ABBR': 'NY/NJ',
                'count': NY_NJ_TOTAL_COUNT
            },
            'geometry': mapping(merged_geometry)
        }
        
        print(f"Created merged NY/NJ feature from {len(ny_nj_features)} states with total count: {NY_NJ_TOTAL_COUNT}")
        return [ny_nj_feature] + other_features
    
    return features

def filter_us_states():
    """Download, filter us_states.geojson to keep only specified states, and save to file."""
    
    # Download the data from Mapbox
    data = download_us_states()
    if data is None:
        print("Failed to download data. Exiting.")
        return
    
    print(f"Downloaded data with {len(data['features'])} states")
    
    # Filter features to keep only specified states
    filtered_features = []
    for feature in data['features']:
        state_name = feature['properties']['STATE_NAME']
        if state_name in STATES_TO_KEEP:
            # Add count to properties
            if state_name in STATE_COUNTS:
                feature['properties']['count'] = STATE_COUNTS[state_name]
            else:
                feature['properties']['count'] = 0
            filtered_features.append(feature)
            print(f"Keeping: {state_name} (count: {feature['properties']['count']})")
        else:
            print(f"Removing: {state_name}")
    
    # Merge DMV states
    features_after_dmv = merge_dmv_states(filtered_features)
    
    # Merge NY/NJ states
    final_features = merge_ny_nj_states(features_after_dmv)
    
    # Create new filtered data
    filtered_data = {
        'type': 'FeatureCollection',
        'features': final_features
    }
    
    # Write the filtered data to the file
    output_file = 'docs/data/us_states.geojson'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_data, f, indent=2)
    
    print(f"\nFiltered us_states.geojson to keep {len(final_features)} features:")
    for feature in final_features:
        count = feature['properties'].get('count', 0)
        print(f"  - {feature['properties']['STATE_NAME']} (count: {count})")
    
    print(f"\nFiltered data saved to: {output_file}")

if __name__ == '__main__':
    filter_us_states() 