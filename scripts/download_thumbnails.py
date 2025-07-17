#!/usr/bin/env python3
"""
Script to download YouTube video thumbnails from videos.csv
Downloads standard resolution thumbnails (1280x720) and saves them to docs/img/thumbnails/
"""

import csv
import os
import re
import requests
from urllib.parse import urlparse, parse_qs
from pathlib import Path

def extract_youtube_id(url):
    """Extract YouTube video ID from various YouTube URL formats"""
    if not url or ('youtube.com' not in url and 'youtu.be' not in url):
        return None
    
    # Handle different YouTube URL formats
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def download_thumbnail(video_id, output_path):
    """Download YouTube thumbnail in standard resolution"""
    # Try different thumbnail resolutions in order of preference
    thumbnail_urls = [
        f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",  # 1280x720 (best quality)
        f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",      # 480x360 (high quality)
        f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",      # 320x180 (medium quality)
        f"https://img.youtube.com/vi/{video_id}/sddefault.jpg",      # 640x480 (standard definition)
    ]
    
    for i, thumbnail_url in enumerate(thumbnail_urls):
        try:
            response = requests.get(thumbnail_url, timeout=10)
            response.raise_for_status()
            
            # Check if we got a valid image (not the default "no thumbnail" image)
            if response.headers.get('content-type', '').startswith('image/'):
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                quality_names = ["maxres", "hq", "mq", "sd"]
                print(f"✓ Downloaded: {video_id} ({quality_names[i]})")
                return True
                
        except requests.exceptions.RequestException:
            continue
    
    print(f"✗ No thumbnail available for: {video_id}")
    return False

def main():
    # Setup paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / "source" / "videos.csv"
    thumbnails_dir = project_root / "docs" / "img" / "thumbnails"
    
    # Create thumbnails directory if it doesn't exist
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    print(f"Thumbnails will be saved to: {thumbnails_dir}")
    
    # Read CSV file
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return
    
    youtube_ids = set()  # Use set to avoid duplicates
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            # Read each line as a URL (no CSV headers)
            for line in file:
                url = line.strip()
                if url:  # Skip empty lines
                    video_id = extract_youtube_id(url)
                    if video_id:
                        youtube_ids.add(video_id)
    
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return
    
    print(f"Found {len(youtube_ids)} unique YouTube videos")
    
    # Download thumbnails
    successful_downloads = 0
    failed_downloads = 0
    
    for video_id in sorted(youtube_ids):
        output_path = thumbnails_dir / f"{video_id}.jpg"
        
        # Skip if already downloaded
        if output_path.exists():
            print(f"⏭️  Already exists: {video_id}")
            successful_downloads += 1
            continue
        
        if download_thumbnail(video_id, output_path):
            successful_downloads += 1
        else:
            failed_downloads += 1
    
    print(f"\nDownload Summary:")
    print(f"✓ Successful: {successful_downloads}")
    print(f"✗ Failed: {failed_downloads}")
    print(f"📁 Thumbnails saved to: {thumbnails_dir}")

if __name__ == "__main__":
    main() 