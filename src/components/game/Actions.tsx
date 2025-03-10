import React, { useState } from 'react';

const Actions = ({ canCheck, currentBet, minRaise, playerChips, onAction }) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  
  return (
    <div className="player-actions bg-gray-900 p-2 rounded-lg mt-2">
      <div className="action-buttons flex gap-2">
        <button 
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
          onClick={() => onAction('fold')}
        >
          Fold
        </button>
        
        {canCheck ? (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            onClick={() => onAction('check')}
          >
            Check
          </button>
        ) : (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            onClick={() => onAction('call', currentBet)}
          >
            Call ${currentBet}
          </button>
        )}
        
        <div className="raise-action">
          <input
            type="range"
            min={minRaise}
            max={playerChips}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
            className="w-full"
          />
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded w-full mt-1"
            onClick={() => onAction('raise', raiseAmount)}
          >
            Raise ${raiseAmount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Actions;