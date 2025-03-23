import React, { useEffect } from 'react';
import { useGame } from '@contexts/gameContext';
import { Card as CardType } from '@game/pokerLogic';

// Card component to display a playing card
const Card = ({ card }: { card: CardType }) => {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  
  const rankDisplay = (value: number) => {
    if (value === 1) return 'A';
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    return value.toString();
  };
  
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  return (
    <div 
      className={`card ${card.faceUp ? 'face-up' : 'face-down'} bg-white border border-gray-300 rounded-lg p-2 w-16 h-24 flex flex-col justify-between`}
    >
      {card.faceUp ? (
        <>
          <div className={`rank-top text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
            {rankDisplay(card.rankValue)}
          </div>
          
          <div className={`suit text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>
            {suitSymbols[card.suit]}
          </div>
          
          <div className={`rank-bottom text-lg font-bold transform rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
            {rankDisplay(card.rankValue)}
          </div>
        </>
      ) : (
        <div className="card-back bg-blue-700 rounded w-full h-full flex items-center justify-center">
          <div className="bg-blue-500 rounded w-4/5 h-4/5 flex items-center justify-center text-white">
            ?
          </div>
        </div>
      )}
    </div>
  );
};

// PlayerHand component to display a player's cards
const PlayerHand = ({ cards, canPlay = false }: { 
  cards: CardType[], 
  canPlay: boolean
}) => {
  return (
    <div className="player-hand flex gap-2 mt-4">
      {cards.map((card) => (
        <div 
          key={card.name} 
          onClick={() => canPlay}
          className={`${canPlay ? 'cursor-pointer hover:transform hover:translate-y-[-10px] transition-transform' : ''}`}
        >
          <Card card={card} />
        </div>
      ))}
    </div>
  );
};

// GameTable component to display the game board
const GameTable = () => {
  const { state, currentPlayer, sendAction, isConnected } = useGame();
  const { players, phase, message, activePlayer } = state;
  
  const isPlayerTurn = currentPlayer && currentPlayer.id === activePlayer.id;
  
  // Handle playing a card
  const handlePlayCard = (cardId: number) => {
    if (isPlayerTurn) {
      sendAction('playCard', { cardId });
    }
  };
  
  // Handle starting a new round
  const handleStartRound = () => {
    sendAction('startRound');
  };
  
  return (
    <div className="game-table bg-green-700 rounded-lg p-4 w-full max-w-4xl mx-auto">
      {/* Game status */}
      <div className="game-status bg-white bg-opacity-20 rounded p-2 text-white mb-4">
        <div className="flex justify-between items-center">
          <div>Game: {state.id}</div>
          <div>Status: {phase}</div>
          <div className={`connection-status ${isConnected ? 'text-green-300' : 'text-red-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div className="message mt-2 text-center font-bold">{message}</div>
      </div>
      
      {/* Game board */}
      <div className="game-board flex flex-col items-center">
        {/* Other players */}
        <div className="other-players flex justify-center gap-4 mb-8">
          {players.filter(p => p.sessionId !== currentPlayer?.id).map((player) => (
            <div key={player.sessionId} className="other-player bg-gray-800 rounded p-2 text-white">
              <div className="player-name font-bold">{player.name}</div>
              <div className="player-chips">Chips: {player.chips}</div>
              <div className="player-status">
                {player.ready ? 'Ready' : 'Not Ready'}
                {currentPlayer === player.sessionId && ' (Current Turn)'}
              </div>
              <PlayerHand cards={player.cards} canPlay={false} />
            </div>
          ))}
        </div>
        
        {/* Controls */}
        <div className="game-controls mb-8">
          {phase === 'waiting' && (
            <button 
              onClick={handleStartRound}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Start Round
            </button>
          )}
          
          {phase === 'endgame' && (
            <button 
              onClick={handleStartRound}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Next Round
            </button>
          )}
        </div>
        
        {/* Current player */}
        {currentPlayer && (
          <div className="current-player bg-blue-800 rounded p-4 text-white w-full">
            <div className="player-info flex justify-between items-center mb-4">
              <div className="player-name font-bold text-xl">{currentPlayer.name}</div>
              <div className="player-score">Chips: {currentPlayer.balance}</div>
              <div className="player-status">
                {isPlayerTurn ? 'Your Turn' : 'Waiting'}
              </div>
            </div>
            
            <div className="player-hand-container">
              <h3 className="text-center mb-2">Your Cards</h3>
              <PlayerHand 
                cards={currentPlayer.cards} 
                canPlay={isPlayerTurn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main CardGame component
const CardGame = ({ gameId, playerId }: { gameId: string, playerId: string }) => {
  const { dispatch } = useGame();
  
  // Join game when component mounts
  useEffect(() => {
    // In a real app, this would be a server call
    // Here we're just simulating with local state
    dispatch({
      type: 'JOIN_GAME',
      payload: {
        gameId,
        players: [
          {
            id: playerId,
            name: 'You',
            score: 0,
            hand: [],
            isActive: true,
            isReady: true
          },
          {
            id: 'ai-1',
            name: 'AI Player 1',
            score: 0,
            hand: [],
            isActive: true,
            isReady: true
          },
          {
            id: 'ai-2',
            name: 'AI Player 2',
            score: 0,
            hand: [],
            isActive: true,
            isReady: true
          }
        ]
      }
    });
  }, [gameId, playerId, dispatch]);
  
  return (
    <div className="card-game p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Card Game</h1>
      <GameTable />
    </div>
  );
};

export default CardGame;