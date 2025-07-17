#!/usr/bin/env python3
"""
Script to update concert playlists with fan-recorded videos from playlist_videos.csv
"""

import csv
import json
import os
from collections import defaultdict

def parse_playlist_videos(csv_file):
    """Parse the playlist videos CSV file and organize by concert location"""
    concerts = defaultdict(list)
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        for row in reader:
            if len(row) >= 5:
                video_type, status, location, song_title, youtube_url = row[:5]
                bilibili_url = row[5] if len(row) > 5 else ""
                
                # Only include confirmed videos
                if status == "Confirmed":
                    concerts[location].append({
                        "song_title": song_title,
                        "youtube_url": youtube_url,
                        "bilibili_url": bilibili_url
                    })
    
    return concerts

def update_concert_playlist(concert_file, fan_videos):
    """Update a concert's playlist with fan-recorded videos"""
    
    # Read the existing concert file
    with open(concert_file, 'r', encoding='utf-8') as f:
        concert_data = json.load(f)
    
    # Get the existing playlist
    playlist = concert_data.get('shenshen', {}).get('playlist', [])
    
    # Create a mapping of existing songs for easy lookup
    existing_songs = {song['song_title']: song for song in playlist}
    
    # Update existing songs with fan videos
    updated_count = 0
    for fan_video in fan_videos:
        song_title = fan_video['song_title']
        
        if song_title in existing_songs:
            # Add fan video links to existing song
            if 'links' not in existing_songs[song_title]:
                existing_songs[song_title]['links'] = {}
            
            if fan_video['youtube_url']:
                existing_songs[song_title]['links']['youtube_video'] = fan_video['youtube_url']
            
            if fan_video['bilibili_url']:
                existing_songs[song_title]['links']['bilibili_video'] = fan_video['bilibili_url']
            
            updated_count += 1
        else:
            # Skip songs that don't exist in the playlist
            print(f"  Skipping '{song_title}' - not found in existing playlist")
    
    return updated_count
    
    # Update the concert data
    if 'shenshen' not in concert_data:
        concert_data['shenshen'] = {}
    concert_data['shenshen']['playlist'] = playlist
    
    # Write back to file
    with open(concert_file, 'w', encoding='utf-8') as f:
        json.dump(concert_data, f, ensure_ascii=False, indent=2)
    
    return len(fan_videos)

def main():
    # File paths
    csv_file = "source/playlist_videos.csv"
    data_dir = "docs/data"
    
    # Concert file mapping
    concert_files = {
        "拉斯维加斯": "las_vegas_concert.json",
        "西雅图": "seattle_concert.json", 
        "纽约": "new_york_concert.json",
        "多伦多": "toronto_concert.json",
        "墨尔本": "melbourne_concert.json",
        "悉尼": "sydney_concert.json",
        "吉隆坡": "kuala_lumpur_concert.json"
    }
    
    # Parse the playlist videos
    print("Parsing playlist videos CSV...")
    concerts = parse_playlist_videos(csv_file)
    
    # Update each concert file
    total_updates = 0
    for location, fan_videos in concerts.items():
        if location in concert_files:
            concert_file = os.path.join(data_dir, concert_files[location])
            
            if os.path.exists(concert_file):
                print(f"Updating {location} concert playlist...")
                updates = update_concert_playlist(concert_file, fan_videos)
                total_updates += updates
                print(f"  Added {updates} fan videos")
            else:
                print(f"Warning: Concert file not found for {location}: {concert_file}")
        else:
            print(f"Warning: No concert file mapping for location: {location}")
    
    print(f"\nTotal existing songs updated with fan videos: {total_updates}")
    print("Concert playlists updated successfully!")

if __name__ == "__main__":
    main() 