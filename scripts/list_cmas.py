#!/usr/bin/env python3
import json

def list_cmas():
    """List all CMA names from the Canada CMA GeoJSON file"""
    
    # Read the source file
    with open('source/Canada CMA Bou_FeaturesToJSO.geojson', 'r') as f:
        data = json.load(f)
    
    # Extract all CMA names
    cma_names = []
    for feature in data['features']:
        cm_name = feature['properties'].get('CMANAME', '')
        if cm_name:
            cma_names.append(cm_name)
    
    # Sort and print
    cma_names.sort()
    print("All CMAs in the dataset:")
    print("=" * 50)
    for i, name in enumerate(cma_names, 1):
        print(f"{i:2d}. {name}")
    
    print(f"\nTotal: {len(cma_names)} CMAs")

if __name__ == "__main__":
    list_cmas() 