#!/usr/bin/env python3
"""
Test script to verify YouTube ID parsing
"""

import re
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

def main():
    # Setup paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / "source" / "videos.csv"
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        return
    
    total_lines = 0
    parsed_count = 0
    failed_urls = []
    
    print("Testing YouTube ID parsing...")
    print("=" * 50)
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        for line_num, line in enumerate(file, 1):
            url = line.strip()
            if url:  # Skip empty lines
                total_lines += 1
                video_id = extract_youtube_id(url)
                if video_id:
                    parsed_count += 1
                    print(f"✓ Line {line_num:3d}: {video_id}")
                else:
                    failed_urls.append((line_num, url))
                    print(f"✗ Line {line_num:3d}: FAILED - {url}")
    
    print("\n" + "=" * 50)
    print(f"Total lines: {total_lines}")
    print(f"Successfully parsed: {parsed_count}")
    print(f"Failed to parse: {len(failed_urls)}")
    
    if failed_urls:
        print(f"\nFailed URLs:")
        for line_num, url in failed_urls:
            print(f"  Line {line_num}: {url}")
    else:
        print(f"\n✅ All URLs parsed successfully!")

if __name__ == "__main__":
    main() 