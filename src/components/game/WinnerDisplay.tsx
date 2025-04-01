import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface WinnerInfo {
  playerId: string;
  playerName: string;
  amount: number;
  potType: string;
  hand?: string;
  cards?: string[];
}

interface WinnerDisplayProps {
  winners: WinnerInfo[];
  showdown: boolean;
  onClose: () => void;
  visible: boolean;
}

const WinnerDisplay = ({ winners, showdown, onClose, visible }: WinnerDisplayProps) => {
  if (!visible || !winners.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-400">
            {winners.length === 1 ? 'Winner!' : 'Winners!'}
          </h2>
          {showdown && <p className="text-white text-sm">Showdown Results</p>}
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {winners.map((winner, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col items-center md:items-start mb-3 md:mb-0">
                <span className="text-white font-medium text-lg">{winner.playerName}</span>
                <span className="text-yellow-300 font-bold text-xl">+{winner.amount} chips</span>
                <span className="text-gray-300 text-sm">{winner.potType}</span>
              </div>
              
              {showdown && winner.hand && (
                <div className="text-center md:text-right">
                  <div className="text-white font-medium mb-1">{winner.hand}</div>
                  {winner.cards && (
                    <div className="flex space-x-1">
                      {winner.cards.map((card, cardIndex) => (
                        <div key={cardIndex} className="w-10 h-14 relative">
                          <Image 
                            src={`/assets/cards_en/${card}.png`}
                            alt={card}
                            width={40}
                            height={56}
                            className="rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerDisplay;