#!/usr/bin/env python3
"""
Script to update concert playlist sections in JSON files with data from playlist.csv
"""

import json
import csv
import os
import glob
from pathlib import Path

def read_playlist_csv(csv_path):
    """Read the playlist CSV file and return a dictionary of song data."""
    playlist_data = {}
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.reader(file, delimiter='\t')  # Use tab as delimiter
        for row in reader:
            if len(row) >= 3:
                song_title = row[0].strip()
                spotify_url = row[1].strip() if len(row) > 1 and row[1].strip() else "#"
                youtube_music_url = row[2].strip() if len(row) > 2 and row[2].strip() else "#"
                apple_music_url = row[3].strip() if len(row) > 3 and row[3].strip() else "#"
                
                playlist_data[song_title] = {
                    "spotify": spotify_url,
                    "apple_music": apple_music_url,
                    "youtube_music": youtube_music_url
                }
    
    return playlist_data

def find_concert_files(data_dir):
    """Find all concert JSON files in the data directory."""
    pattern = os.path.join(data_dir, "*_concert.json")
    return glob.glob(pattern)

def update_concert_playlist(concert_file_path, playlist_data):
    """Update the playlist section in a concert JSON file."""
    
    # Read the existing concert JSON file
    with open(concert_file_path, 'r', encoding='utf-8') as file:
        concert_data = json.load(file)
    
    # Check if the file has a playlist section
    if 'shenshen' not in concert_data:
        print(f"Warning: {concert_file_path} does not have 'shenshen' section")
        return False
    
    if 'playlist' not in concert_data['shenshen']:
        print(f"Warning: {concert_file_path} does not have playlist section")
        return False
    
    # Get existing playlist
    existing_playlist = concert_data['shenshen']['playlist']
    
    # Update only existing songs, do not append new ones
    updated_playlist = []
    for song in existing_playlist:
        song_title = song.get('song_title')
        if song_title:
            # Find matching song in playlist_data using contains
            matched_song = None
            for csv_song_title, csv_song_data in playlist_data.items():
                if csv_song_title in song_title or song_title in csv_song_title:
                    matched_song = csv_song_data
                    break
            
            if matched_song:
                # Update spotify, apple_music, and youtube_music links from CSV
                links = song.get('links', {})
                links['spotify'] = matched_song.get('spotify', links.get('spotify', '#'))
                links['apple_music'] = matched_song.get('apple_music', links.get('apple_music', '#'))
                links['youtube_music'] = matched_song.get('youtube_music', links.get('youtube_music', '#'))
                song['links'] = links
        # else: leave the song unchanged if not in CSV
        updated_playlist.append(song)
    
    # Update the playlist in the concert data
    concert_data['shenshen']['playlist'] = updated_playlist
    
    # Write the updated data back to the file
    with open(concert_file_path, 'w', encoding='utf-8') as file:
        json.dump(concert_data, file, ensure_ascii=False, indent=2)
    
    return True

def main():
    """Main function to update all concert playlists."""
    
    # Define paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / "source" / "playlist.csv"
    data_dir = project_root / "docs" / "data"
    
    # Check if CSV file exists
    if not csv_path.exists():
        print(f"Error: Playlist CSV file not found at {csv_path}")
        return
    
    # Check if data directory exists
    if not data_dir.exists():
        print(f"Error: Data directory not found at {data_dir}")
        return
    
    # Read playlist data from CSV
    print("Reading playlist data from CSV...")
    playlist_data = read_playlist_csv(csv_path)
    print(f"Found {len(playlist_data)} songs in playlist")
    
    # Find all concert files
    print("Finding concert JSON files...")
    concert_files = find_concert_files(data_dir)
    print(f"Found {len(concert_files)} concert files")
    
    # Update each concert file
    updated_count = 0
    for concert_file in concert_files:
        print(f"Updating {os.path.basename(concert_file)}...")
        if update_concert_playlist(concert_file, playlist_data):
            updated_count += 1
            print(f"  ✓ Updated successfully")
        else:
            print(f"  ✗ Failed to update")
    
    print(f"\nSummary: Updated {updated_count} out of {len(concert_files)} concert files")

if __name__ == "__main__":
    main() 