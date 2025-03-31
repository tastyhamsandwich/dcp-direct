import React, { useState, useEffect } from 'react';

  interface ActionsProps {
    roundStatus: string;
    canCheck: boolean;
    gameCurrentBet: number;
    playerCurrentBet: number;
    minRaise: number;
    playerChips: number;
    onAction: (actionType: string, amount?: number) => void;
    isActive: boolean; // Add this prop to enable/disable buttons based on turn
    allowedActions?: string[]; // Optional array of allowed actions
    isPlayerReady?: boolean; // Whether this player is ready for the next round
  }

  const Actions: React.FC<ActionsProps> = ({ 
    roundStatus, 
    canCheck, 
    gameCurrentBet, 
    playerCurrentBet,
    minRaise, 
    playerChips, 
    onAction,
    isActive,
    allowedActions = ['fold', 'check', 'call', 'bet', 'raise'],
    isPlayerReady = false
  }) => {
    const [raiseAmount, setRaiseAmount] = useState<number>(minRaise);
    const [isReady, setIsReady] = useState<boolean>(isPlayerReady);

    // Update raise amount when minimum changes
    useEffect(() => {
      setRaiseAmount(minRaise);
    }, [minRaise]);

    // Sync ready state with props
    useEffect(() => {
      setIsReady(isPlayerReady);
    }, [isPlayerReady]);

    const toggleReady = () => {
      onAction('toggleReady');
      // Don't manually set isReady here - we'll let the server update it
      // and then sync through props for consistency
    }

    // Check if an action is allowed
    const isActionAllowed = (action: string) => {
      return allowedActions.includes(action);
    }

    if (roundStatus === 'waiting') {
      return (
        <div className="player-actions bg-gray-900 p-2 rounded-lg mt-2">
          <button 
            onClick={toggleReady}
            className={`px-4 py-2 rounded text-white ${isReady ? 'bg-blue-600' : 'bg-red-600'}`}
          >
            {isReady ? 'Ready' : 'Not Ready'}
          </button>
        </div>
      )
    } else {
      return (
        <div className="player-actions bg-gray-900 p-2 rounded-lg mt-2">
          {!isActive && (
            <div className="text-gray-400 text-center mb-2">Waiting for your turn...</div>
          )}
          <div className="action-buttons flex gap-2">
            <button 
              className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded ${!isActive || 
  !isActionAllowed('fold') ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => isActive && isActionAllowed('fold') && onAction('fold')}
              disabled={!isActive || !isActionAllowed('fold')}
            >
              Fold
            </button>

            {canCheck ? (
              <button 
                className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${!isActive || 
  !isActionAllowed('check') ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isActive && isActionAllowed('check') && onAction('check')}
                disabled={!isActive || !isActionAllowed('check')}
              >
                Check
              </button>
            ) : (
              <button 
                className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${!isActive || 
  !isActionAllowed('call') ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isActive && isActionAllowed('call') && onAction('call', gameCurrentBet)}
                disabled={!isActive || !isActionAllowed('call')}
              >
                Call {gameCurrentBet - playerCurrentBet}
              </button>
            )}

            <div className="raise-action flex flex-col w-full">
              <input
                type="range"
                min={minRaise}
                max={playerChips}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full"
                disabled={!isActive}
              />
              <div className="text-gray-300 text-xs text-center">{raiseAmount}</div>
              {gameCurrentBet === 0 ? (
                <button 
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${!isActive || 
  !isActionAllowed('bet') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isActive && isActionAllowed('bet') && onAction('bet', raiseAmount)}
                  disabled={!isActive || !isActionAllowed('bet')}
                >
                  Bet {raiseAmount}
                </button>
              ) : (
                <button
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${!isActive || 
  !isActionAllowed('raise') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isActive && isActionAllowed('raise') && onAction('raise', raiseAmount)}
                  disabled={!isActive || !isActionAllowed('raise')}
                >
                  Raise to {raiseAmount + gameCurrentBet}
                </button>
              )}
            </div>
            PlayerCB: {playerCurrentBet}
            GameCB: {gameCurrentBet}
          </div>
        </div>
      );
    };
  };

  export default Actions;