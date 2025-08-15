import React from 'react';

export default function EmptySlot({ position, onClick }: { position: string; onClick: () => void }) {
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center text-xs font-semibold cursor-pointer hover:bg-opacity-75 transition-colors ${getPositionColor(position)}`}
    >
      <div className="text-center">
        <div>+</div>
        <div>{position}</div>
      </div>
    </div>
  );
}
