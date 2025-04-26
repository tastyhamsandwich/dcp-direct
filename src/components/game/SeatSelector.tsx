import React from 'react';
import Image from 'next/image';
import { Dialog } from '@comps/ui/Dialog';

interface SeatSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSeatSelect: (seatNumber: number) => void;
  maxPlayers: number;
  occupiedSeats: Array<{
    seatNumber: number;
    occupied: boolean;
    playerName: string | null;
  }>;
}

export const SeatSelector: React.FC<SeatSelectorProps> = ({
  isOpen,
  onClose,
  onSeatSelect,
  maxPlayers,
  occupiedSeats,
}) => {
  // Calculate seat positions in a circle around the table
  const calculateSeatPosition = (index: number, total: number) => {
    const radius = 180; // Increased distance from center
    const angleStep = (2 * Math.PI) / total;
    const angle = angleStep * index - Math.PI / 2; // Start from top (-90 degrees)
    
    return {
      left: `${Math.cos(angle) * radius + 250}px`, // Center point
      top: `${Math.sin(angle) * radius + 250}px`, // Center point
    };
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-8 rounded-lg relative w-[600px] h-[600px] border-2 border-yellow-600">
          <div className="absolute inset-0 bg-[url('/assets/bg.png')] opacity-20 rounded-lg" />
          
          <h2 className="text-2xl font-bold mb-4 text-center text-yellow-400 relative z-10">
            Select Your Seat
          </h2>
          
          {/* Table image in the center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Image 
              src="/assets/table.png" 
              alt="Poker Table" 
              width={300} 
              height={150}
              className="opacity-80"
            />
          </div>

          {/* Seats */}
          {Array.from({ length: maxPlayers }).map((_, index) => {
            const position = calculateSeatPosition(index, maxPlayers);
            const seatInfo = occupiedSeats.find(s => s.seatNumber === index);
            const isOccupied = seatInfo?.occupied ?? false;
            
            return (
              <div
                key={index}
                className="absolute"
                style={position}
              >
                <button
                  className={`w-16 h-16 rounded-full border-4 
                    ${isOccupied 
                      ? 'bg-red-900 border-red-700 cursor-not-allowed' 
                      : 'bg-green-800 border-green-600 hover:bg-green-700 hover:border-green-500 cursor-pointer'
                    } flex items-center justify-center transition-all duration-200 shadow-lg`}
                  onClick={() => !isOccupied && onSeatSelect(index)}
                  disabled={isOccupied}
                >
                  <span className="text-white font-bold text-xl">{index + 1}</span>
                </button>
                {isOccupied && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm">
                    <span className="bg-black/50 text-white px-2 py-1 rounded">
                      {seatInfo?.playerName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </Dialog>
  );
};