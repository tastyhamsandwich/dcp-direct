import React, { useState } from 'react'

const GridEditor = ({ variant, onChange }) => {
  const [selectedPhase, setSelectedPhase] = useState<"flop" | "turn" | "river" | null>('flop');
  const [cardCount, setCardCount] = useState(1);
  
  const gridSize = 5;
  
  const handleCellClick = (row, col) => {
    // Create a deep copy of the grid
    const newGrid: GridCell[][] = JSON.parse(JSON.stringify(variant.communityCards.grid)) as GridCell[][];
    
    // Toggle between card and empty
    if (newGrid[row][col].type === 'empty') {
      newGrid[row][col] = {
        type: 'card',
        cardCount: cardCount,
        phase: selectedPhase,
        groupId: `${selectedPhase}${row}${col}`
      };
    } else {
      // If already a card, either change its phase or make it empty
      if (newGrid[row][col].phase === selectedPhase) {
        newGrid[row][col] = {
          type: 'empty',
          cardCount: 0,
          phase: null,
          groupId: ''
        };
      } else {
        newGrid[row][col] = {
          ...newGrid[row][col],
          phase: selectedPhase,
          groupId: `${selectedPhase}${row}${col}`
        };
      }
    }
    
    // Update the variant
    onChange({
      ...variant,
      communityCards: {
        ...variant.communityCards,
        grid: newGrid
      }
    });
  };
  
  const getCellClass = (cell) => {
    if (cell.type === 'empty') return 'bg-gray-200';
    
    // Color based on phase
    switch(cell.phase) {
      case 'flop': return 'bg-green-500';
      case 'turn': return 'bg-blue-500';
      case 'river': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getCellText = (cell) => {
    if (cell.type === 'empty') return '';
    return `${cell.cardCount} ${cell.phase}`;
  };
  
  // Create a 5x5 grid if it doesn't exist
  if (!variant.communityCards.grid || variant.communityCards.grid.length !== gridSize) {
    const emptyGrid = Array(gridSize).fill(0).map(() => 
      Array(gridSize).fill(0).map(() => ({
        type: 'empty',
        cardCount: 0,
        phase: null,
        groupId: ''
      }))
    );
    
    onChange({
      ...variant,
      communityCards: {
        ...variant.communityCards,
        grid: emptyGrid
      }
    });
  }
  
  return (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4">
        <div>
          <label className="block font-medium mb-1">Phase</label>
          <select 
            value={selectedPhase || ''}
            onChange={(e) => setSelectedPhase(e.target.value as "flop" | "turn" | "river")}
            className="p-2 border rounded"
          >
            <option value="flop">Flop</option>
            <option value="turn">Turn</option>
            <option value="river">River</option>
          </select>
        </div>
        
        <div>
          <label className="block font-medium mb-1">Cards</label>
          <select 
            value={cardCount}
            onChange={(e) => setCardCount(parseInt(e.target.value, 10))}
            className="p-2 border rounded"
          >
            <option value="1">1 Card</option>
            <option value="3">3 Cards (Flop)</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-1">
        {variant.communityCards.grid?.map((row, rowIdx) => (
          row.map((cell, colIdx) => (
            <div 
              key={`${rowIdx}-${colIdx}`}
              className={`w-16 h-16 flex items-center justify-center text-white cursor-pointer ${getCellClass(cell)}`}
              onClick={() => handleCellClick(rowIdx, colIdx)}
            >
              {getCellText(cell)}
            </div>
          ))
        ))}
      </div>
      
      <div className="mt-4 text-sm">
        <p>Click on grid cells to place or remove cards.</p>
        <p>Green = Flop, Blue = Turn, Purple = River</p>
      </div>
    </div>
  );
};

export default GridEditor;