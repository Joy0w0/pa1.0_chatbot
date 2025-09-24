#!/usr/bin/env python3
import pandas as pd
import json

def calculate_team_breakdown():
    """target_teams_data.csv에서 각 팀의 F/B breakdown 비율을 계산합니다."""
    
    # CSV 파일 읽기
    df = pd.read_csv('target_teams_data.csv')
    
    # 각 팀별로 그룹화하여 계산
    teams = ['TEAM119', 'TEAM044', 'TEAM080']
    results = {}
    
    for team in teams:
        team_data = df[df['team_name'] == team]
        
        # fingertime과 braintime의 총 시간 계산
        fingertime_total = team_data[team_data['type'] == 'fingertime']['duration'].sum()
        braintime_total = team_data[team_data['type'] == 'braintime']['duration'].sum()
        total_time = fingertime_total + braintime_total
        
        if total_time > 0:
            fingertime_percent = round((fingertime_total / total_time) * 100)
            braintime_percent = round((braintime_total / total_time) * 100)
        else:
            fingertime_percent = 0
            braintime_percent = 0
        
        results[team] = {
            'fingertime_minutes': round(fingertime_total, 2),
            'braintime_minutes': round(braintime_total, 2),
            'total_minutes': round(total_time, 2),
            'fingertime_percent': fingertime_percent,
            'braintime_percent': braintime_percent
        }
        
        print(f"\n{team}:")
        print(f"  Fingertime: {fingertime_total:.2f}분 ({fingertime_percent}%)")
        print(f"  Braintime: {braintime_total:.2f}분 ({braintime_percent}%)")
        print(f"  Total: {total_time:.2f}분")
    
    # 결과를 JSON 파일로 저장
    with open('fb_breakdown_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n결과가 'fb_breakdown_results.json' 파일에 저장되었습니다.")
    return results

if __name__ == "__main__":
    calculate_team_breakdown()