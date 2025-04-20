import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@hooks/useWebSocket';
import { GameVariant } from '@game/types';
import Button from '@components/ui/Button';

interface DealerVariantSelectorProps {
  isVisible: boolean;
  dealerId: string | undefined;
  currentPlayerId: string | undefined;
  gameId: string;
  onVariantSelected: () => void;
  timeoutMs?: number;
}

const variantNames: Record<GameVariant, string> = {
  TexasHoldEm: "Texas Hold'em",
  Omaha: "Omaha",
  OmahaHiLo: "Omaha Hi/Lo",
  FiveCardDraw: "Five Card Draw",
  SevenCardStud: "Seven Card Stud",
  Chicago: "Chicago",
  DealersChoice: "Dealer's Choice",
  Custom: "Custom Game"
};

const DealerVariantSelector: React.FC<DealerVariantSelectorProps> = ({
  isVisible,
  dealerId,
  currentPlayerId,
  gameId,
  onVariantSelected,
  timeoutMs = 15000
}) => {
  const { socket } = useWebSocket(gameId);
  const [selectedVariant, setSelectedVariant] = useState<GameVariant>('TexasHoldEm');
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs / 1000);
  const isDealer = dealerId === currentPlayerId;

  // Handle timer countdown
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isDealer) {
            handleSubmit(); // Auto-submit on timeout
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isVisible, isDealer]);
  
  // Reset timer when visibility changes
  useEffect(() => {
    if (isVisible) {
      setTimeRemaining(timeoutMs / 1000);
    }
  }, [isVisible, timeoutMs]);

  const handleVariantSelect = (variant: GameVariant) => {
    setSelectedVariant(variant);
  };

  const handleSubmit = () => {
    if (socket && isDealer) {
      socket.emit('select_variant', {
        gameId,
        variant: selectedVariant
      });
      console.log(`Dealer selected variant: ${selectedVariant}`);
    }
    onVariantSelected();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">
          {isDealer 
            ? "Select Poker Variant" 
            : `Waiting for dealer to select a variant (${timeRemaining}s)`}
        </h2>
        
        {isDealer ? (
          <>
            <p className="text-gray-300 mb-4">
              As the dealer, you get to choose which poker variant to play for this hand.
              Time remaining: {timeRemaining}s
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(variantNames)
                .filter(([key]) => key !== 'DealersChoice' && key !== 'Custom')
                .map(([variant, name]) => (
                  <button
                    key={variant}
                    className={`p-2 rounded ${
                      selectedVariant === variant
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                    onClick={() => handleVariantSelect(variant as GameVariant)}
                  >
                    {name}
                  </button>
                ))}
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirm Selection
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              The dealer is selecting which poker variant to play for this hand.
            </p>
            <div className="animate-pulse">
              <svg 
                className="w-8 h-8 mx-auto text-blue-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerVariantSelector;