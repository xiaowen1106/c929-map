#!/usr/bin/env python3
"""
Script to rename all thumbnail files by adding 'yt_' prefix
"""

import os
import shutil
from pathlib import Path

def rename_thumbnails():
    """Rename all files in the thumbnails directory by adding 'yt_' prefix"""
    
    # Path to thumbnails directory
    thumbnails_dir = Path("docs/img/thumbnails")
    
    if not thumbnails_dir.exists():
        print(f"Error: Directory {thumbnails_dir} does not exist")
        return
    
    # Get all files in the directory
    files = [f for f in thumbnails_dir.iterdir() if f.is_file()]
    
    if not files:
        print("No files found in thumbnails directory")
        return
    
    print(f"Found {len(files)} files to rename")
    
    # Track successful and failed renames
    successful = 0
    failed = 0
    
    for file_path in files:
        # Get the filename without path
        filename = file_path.name
        
        # Skip if already has yt_ prefix
        if filename.startswith('yt_'):
            print(f"Skipping {filename} - already has yt_ prefix")
            continue
        
        # Create new filename with yt_ prefix
        new_filename = f"yt_{filename}"
        new_path = file_path.parent / new_filename
        
        # Check if target file already exists
        if new_path.exists():
            print(f"Warning: {new_filename} already exists, skipping {filename}")
            failed += 1
            continue
        
        try:
            # Rename the file
            file_path.rename(new_path)
            print(f"Renamed: {filename} -> {new_filename}")
            successful += 1
        except Exception as e:
            print(f"Error renaming {filename}: {e}")
            failed += 1
    
    print(f"\nRename complete:")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Total processed: {successful + failed}")

if __name__ == "__main__":
    rename_thumbnails() 