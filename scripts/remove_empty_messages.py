#!/usr/bin/env python3
"""
Script to remove empty or minimal messages from messages_geocoded.geojson
"""

import json
import re

def is_empty_message(message, min_length=5):
    """
    Check if a message should be considered empty or minimal
    
    Args:
        message (str): The message text
        min_length (int): Minimum acceptable message length
    
    Returns:
        bool: True if message should be removed, False otherwise
    """
    if not message:
        return True
    
    # Remove whitespace and check if empty
    stripped = message.strip()
    if not stripped:
        return True
    
    # Check if message is too short
    if len(stripped) < min_length:
        return True
    
    # Check if message contains only punctuation or symbols
    if re.match(r'^[^\w\s]*$', stripped):
        return True
    
    # Check if message is just common minimal responses
    minimal_responses = ['yes', 'no', 'ok', 'okay', 'hi', 'hello', 'thanks', 'thank you']
    if stripped.lower() in minimal_responses:
        return True
    
    return False

def remove_empty_messages(input_file, output_file, min_length=5):
    """
    Remove empty or minimal messages from a GeoJSON file
    
    Args:
        input_file (str): Path to input GeoJSON file
        output_file (str): Path to output GeoJSON file
        min_length (int): Minimum acceptable message length
    """
    print(f"Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data['features'])
    print(f"Original message count: {original_count}")
    
    # Filter out empty messages
    filtered_features = []
    removed_count = 0
    
    for feature in data['features']:
        message = feature['properties'].get('message', '')
        
        if is_empty_message(message, min_length):
            removed_count += 1
            print(f"Removing message: '{message}' (ID: {feature['properties'].get('fakeId', 'unknown')})")
        else:
            filtered_features.append(feature)
    
    data['features'] = filtered_features
    final_count = len(filtered_features)
    
    print(f"Removed {removed_count} messages")
    print(f"Final message count: {final_count}")
    
    # Write filtered data to output file
    print(f"Writing filtered data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("Done!")

if __name__ == "__main__":
    input_file = "docs/data/messages_geocoded.geojson"
    output_file = "docs/data/messages_geocoded_filtered.geojson"
    
    # You can adjust the minimum length here
    min_length = 5
    
    remove_empty_messages(input_file, output_file, min_length) 