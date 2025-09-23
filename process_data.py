#!/usr/bin/env python3
import pandas as pd
import json
import ast
from datetime import datetime, timedelta
import re

def process_team_data():
    # Read CSV data
    df = pd.read_csv('target_teams_data.csv')
    
    # Create header row
    df.columns = ['team_name', 'email', 'start_time', 'end_time', 'duration', 'type', 'aidd_count', 'recommend_types']
    
    # Team mapping
    team_mapping = {
        'TEAM119': {'project': 'Project01', 'max_quality': 77, 'max_tasks': 96},
        'TEAM044': {'project': 'Project02', 'max_quality': 41, 'max_tasks': 77}, 
        'TEAM080': {'project': 'Project03', 'max_quality': 11, 'max_tasks': 60}  # Changed from TEAM065 to TEAM080
    }
    
    projects_data = {}
    
    for team, info in team_mapping.items():
        team_df = df[df['team_name'] == team].copy()
        
        if team_df.empty:
            continue
            
        print(f"\n=== Processing {team} ({info['project']}) ===")
        
        # Get unique developers
        developers = team_df['email'].unique()
        print(f"Developers: {list(developers)}")
        
        # Parse timeline data
        timeline_data = []
        aidd_summary = {}
        
        for _, row in team_df.iterrows():
            # Convert time to minutes from 16:00:00
            start_parts = row['start_time'].split(':')
            start_minutes = (int(start_parts[0]) - 16) * 60 + int(start_parts[1]) + int(start_parts[2]) / 60
            
            end_parts = row['end_time'].split(':') 
            end_minutes = (int(end_parts[0]) - 16) * 60 + int(end_parts[1]) + int(end_parts[2]) / 60
            
            # Parse recommend_types
            bubbles = []
            if pd.notna(row['recommend_types']) and row['recommend_types'].strip() and row['recommend_types'] != '{}':
                try:
                    # Clean the string and convert to dict
                    recommend_str = str(row['recommend_types']).strip()
                    if recommend_str.startswith('"') and recommend_str.endswith('"'):
                        recommend_str = recommend_str[1:-1]
                    
                    # Replace single quotes with double quotes for JSON parsing
                    recommend_str = recommend_str.replace("'", '"')
                    recommend_dict = json.loads(recommend_str)
                    
                    for aidd_type, count in recommend_dict.items():
                        bubbles.append({'type': aidd_type, 'count': int(count)})
                        
                        # Add to summary
                        if aidd_type not in aidd_summary:
                            aidd_summary[aidd_type] = 0
                        aidd_summary[aidd_type] += int(count)
                        
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Error parsing recommend_types: {row['recommend_types']} - {e}")
            
            timeline_entry = {
                'start': max(0, start_minutes),
                'end': min(120, end_minutes),  # Cap at 120 minutes (18:00)
                'type': row['type'],
                'user': row['email'],
                'bubbles': bubbles,
                'duration': float(row['duration']),
                'aidd_count': int(row['aidd_count']) if pd.notna(row['aidd_count']) else 0
            }
            
            timeline_data.append(timeline_entry)
        
        # Sort timeline by start time
        timeline_data.sort(key=lambda x: x['start'])
        
        # Calculate summary statistics
        total_fingertime = sum(item['duration'] for item in timeline_data if item['type'] == 'fingertime')
        total_braintime = sum(item['duration'] for item in timeline_data if item['type'] == 'braintime')
        total_closetime = sum(item['duration'] for item in timeline_data if item['type'] == 'closetime')
        
        total_active_time = total_fingertime + total_braintime
        fingertime_percent = round((total_fingertime / total_active_time) * 100) if total_active_time > 0 else 0
        braintime_percent = round((total_braintime / total_active_time) * 100) if total_active_time > 0 else 0
        
        # Get top 3 AIDD types
        top_aidd = sorted(aidd_summary.items(), key=lambda x: x[1], reverse=True)[:3]
        
        projects_data[info['project']] = {
            'team_name': team,
            'developers': list(developers),
            'timeline_data': timeline_data,
            'summary': {
                'total_fingertime': total_fingertime,
                'total_braintime': total_braintime, 
                'total_closetime': total_closetime,
                'fingertime_percent': fingertime_percent,
                'braintime_percent': braintime_percent,
                'top_aidd_types': top_aidd,
                'all_aidd_types': dict(aidd_summary)
            },
            'max_quality': info['max_quality'],
            'max_tasks': info['max_tasks']
        }
        
        print(f"Timeline entries: {len(timeline_data)}")
        print(f"Total Fingertime: {total_fingertime:.1f} min ({fingertime_percent}%)")
        print(f"Total Braintime: {total_braintime:.1f} min ({braintime_percent}%)")
        print(f"Top AIDD types: {top_aidd[:3]}")
    
    # Save processed data
    with open('processed_team_data.json', 'w') as f:
        json.dump(projects_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Summary ===")
    print(f"Processed data saved to 'processed_team_data.json'")
    print(f"Total projects: {len(projects_data)}")
    
    return projects_data

if __name__ == "__main__":
    process_team_data()