import React, { useState, useEffect } from 'react';

interface SquadPlayer {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price?: number;
  total_points?: number;
  photo_url?: string | null;
  is_captain?: boolean;
  is_vice_captain?: boolean;
  teams?: { short_name?: string; name?: string; primary_color?: string };
}

export default function PlayerBadge({
  player,
  onRemove,
  onAssignCaptain,
  onAssignVice
}: {
  player: SquadPlayer;
  onRemove?: (id: string) => void;
  onAssignCaptain?: (id: string) => void;
  onAssignVice?: (id: string) => void;
}) {
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const lastName = player.name ? player.name.split(' ').pop() : '';
  const teamLabel = player.teams?.short_name || player.teams?.name || '';

  const [menuOpen, setMenuOpen] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuOpen) {
        setMenuOpen(false);
      }
    }
    
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('PlayerBadge clicked', { 
      playerName: player.name,
      hasAssignCaptain: !!onAssignCaptain,
      hasAssignVice: !!onAssignVice,
      currentMenuOpen: menuOpen
    });
    if (onAssignCaptain || onAssignVice) {
      setMenuOpen(prev => !prev);
    }
  };

  return (
    <div className="relative group flex flex-col items-center w-20 overflow-visible">
      <div onClick={handleClick} className="w-16 h-16 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white cursor-pointer relative">
        <img
          src={player.photo_url || '/players/default.svg'}
          alt={player.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/players/default.svg'; }}
        />
      </div>

      {/* Hover tooltip: moved outside of image container and positioned below */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-[99999]">
        <div className="bg-white text-sm rounded shadow-lg p-3 border border-gray-200">
          <div className="font-semibold truncate" style={{ backgroundColor: player.teams?.primary_color || 'transparent', color: player.teams?.primary_color ? 'white' : 'black', padding: '2px 4px', borderRadius: 4 }}>{player.name}</div>
          <div className="text-xs text-gray-600 mt-1"><span className="font-bold">{teamLabel}</span> · {player.position}</div>
          <div className="mt-1 text-xs text-gray-700 flex justify-between">
            <div>积分: <span className="font-bold">{player.total_points ?? 0}</span></div>
            <div>价格: <span className="font-bold">£{(player.price ?? 0).toFixed(1)}m</span></div>
          </div>
        </div>
      </div>

      {/* Click menu for assign actions - moved outside the overflow-hidden container */}
      {menuOpen && (() => {
        console.log('Rendering menu for player:', player.name, { onAssignCaptain: !!onAssignCaptain, onAssignVice: !!onAssignVice });
        return (
          <div 
            className="absolute left-1/2 -translate-x-1/2 top-16 mt-2 z-[99999]" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded shadow-lg p-2 border border-gray-200 text-sm min-w-[120px]">
              {onAssignCaptain && (
                <button onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  console.log('Captain button clicked for player:', player.id, player.name);
                  onAssignCaptain(player.id); 
                  setMenuOpen(false); 
                }} className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded">设为队长</button>
              )}
              {onAssignVice && (
                <button onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  console.log('Vice captain button clicked for player:', player.id, player.name);
                  onAssignVice(player.id); 
                  setMenuOpen(false); 
                }} className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded">设为副队长</button>
              )}
              <button onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                console.log('Cancel button clicked');
                setMenuOpen(false); 
              }} className="block w-full text-left px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">取消</button>
            </div>
          </div>
        );
      })()}

      <div className="mt-1 text-center w-full">
        <div className="flex items-center justify-center gap-1">
          <div className={`text-xs font-bold text-gray-800 truncate ${getPositionColor(player.position)}`} style={{ padding: '2px 6px', borderRadius: 6 }}>{lastName}</div>
          {/* Captain/Vice Captain badges moved here */}
          {player.is_captain && (
            <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white shadow-sm">C</div>
          )}
          {player.is_vice_captain && !player.is_captain && (
            <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white shadow-sm">V</div>
          )}
        </div>
        {teamLabel && (
          <div className="mt-0.5 text-[10px] px-2 py-0.5 rounded-full inline-block truncate font-bold">
            {teamLabel}
          </div>
        )}
        {/* Points display */}
        <div className="mt-0.5 text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded font-bold">
          {player.total_points ?? 0}分
        </div>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(player.id); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        >
          ✕
        </button>
      )}
    </div>
  );
}
