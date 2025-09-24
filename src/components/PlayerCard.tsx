"use client";

import React from 'react';
import Card from './ui/Card';
import { TEAM_INFO_MAP } from '@/lib/teamHelpers';

export interface PlayerProps {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team: string;
  photo_url?: string | null;
  price: number;
  total_points: number;
  goals: number;
  assists: number;
}

const getPositionColor = (position: string) => {
  switch (position) {
    case 'GK': return 'bg-yellow-100 text-yellow-800';
    case 'DEF': return 'bg-blue-100 text-blue-800';
    case 'MID': return 'bg-green-100 text-green-800';
    case 'FWD': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function PlayerCard(player: PlayerProps) {
  const teamInfo = TEAM_INFO_MAP[player.team];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <img
            src={player.photo_url ?? '/players/default.svg'}
            alt={player.name}
            className="w-16 h-16 rounded-full object-cover border border-gray-200"
          />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{player.name}</h3>
            <div className="flex items-center space-x-2">
              {teamInfo?.logo_url && (
                <img
                  src={teamInfo.logo_url}
                  alt={teamInfo.short_name}
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <p className="text-sm text-gray-600">{teamInfo?.name || '未知球队'}</p>
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPositionColor(player.position)}`}>
          {player.position}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">£{player.price}m</div>
          <div className="text-xs text-gray-500">价格</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{player.total_points}</div>
          <div className="text-xs text-gray-500">总积分</div>
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-600 mb-4">
        <span>进球: {player.goals}</span>
        <span>助攻: {player.assists}</span>
      </div>

      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-semibold">
        添加到球队
      </button>
    </Card>
  );
}
