"use client";

import React, { useState } from 'react';
import { Player, GameType, GameVariant } from '@/types/game';

type GameFormState = {
  name: string;
  maxPlayers: number;
  smallBlind: number;
  gameVariant: GameVariant;
  gameType: GameType | "";
  wagerPerGame: number;
};

type GameFormErrors = {
  name: string;
  maxPlayers: string;
  smallBlind: string;
  gameType: string;
  wagerPerGame: string;
};

type NumericField = 'maxPlayers' | 'smallBlind' | 'wagerPerGame';

interface CreateGameModalProps {
  onClose?: () => void;
  onSubmit?: (gameData: any) => void;
  player?: Player;
}

/**
 * Modal dialog for configuring and launching new poker or pinochle tables.
 *
 * @param {CreateGameModalProps} props - Handlers for closing, submitting, and the active player context.
 * @returns {JSX.Element} Rendered modal markup.
 * @example
 * <CreateGameModal onSubmit={handleCreateGame} onClose={closeModal} player={player} />
 */
const CreateGameModal: React.FC<CreateGameModalProps> = ({
  onClose = () => {},
  onSubmit = () => {},
  player
}) => {
  const [gameData, setGameData] = useState<GameFormState>({
    name: '',
    maxPlayers: 6,
    smallBlind: 5,
    gameVariant: 'TexasHoldEm',
    gameType: '',
    wagerPerGame: 50
  });

  const [errors, setErrors] = useState<GameFormErrors>({
    name: '',
    maxPlayers: '',
    smallBlind: '',
    gameType: '',
    wagerPerGame: ''
  });

  const isPoker = gameData.gameType === 'Poker';
  const isPinochle = gameData.gameType === 'Pinochle';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields: NumericField[] = ['maxPlayers', 'smallBlind', 'wagerPerGame'];
    const clearableErrors: Array<keyof GameFormErrors> = ['name', 'maxPlayers', 'smallBlind', 'gameType', 'wagerPerGame'];
    const fieldName = name as keyof GameFormState;
    const errorField = name as keyof GameFormErrors;
    const isNumericField = numericFields.includes(fieldName as NumericField);

    setGameData(prev => ({
      ...prev,
      [fieldName]: isNumericField
        ? parseInt(value, 10) || 0
        : value
    }));

    if (clearableErrors.includes(errorField) && errors[errorField]) {
      setErrors(prev => ({
        ...prev,
        [errorField]: '',
        ...(errorField === 'gameType'
          ? { maxPlayers: '', smallBlind: '', wagerPerGame: '' }
          : {})
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors: GameFormErrors = {
      name: '',
      maxPlayers: '',
      smallBlind: '',
      gameType: '',
      wagerPerGame: ''
    };

    if (!gameData.name.trim()) {
      newErrors.name = 'Game name is required';
      valid = false;
    }

    if (!gameData.gameType) {
      newErrors.gameType = 'Select a game type to continue';
      valid = false;
    }

    if (isPoker) {
      if (gameData.maxPlayers < 2 || gameData.maxPlayers > 10) {
        newErrors.maxPlayers = 'Max players must be between 2 and 10';
        valid = false;
      }

      if (gameData.smallBlind < 1) {
        newErrors.smallBlind = 'Small blind must be at least 1';
        valid = false;
      }
    }

    if (isPinochle && gameData.wagerPerGame < 1) {
      newErrors.wagerPerGame = 'Wager must be at least 1';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(gameData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-300">Create New Game</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="name">
              Game Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={gameData.name}
              onChange={handleChange}
              className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="My Game Table"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="gameType">
              Game Type
            </label>
            <select
              id="gameType"
              name="gameType"
              value={gameData.gameType}
              onChange={handleChange}
              className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a game type</option>
              <option value="Poker">Poker</option>
              <option value="Pinochle">Pinochle</option>
            </select>
            {errors.gameType && <p className="text-red-500 text-sm mt-1">{errors.gameType}</p>}
            <p className="text-gray-400 text-sm mt-1">
              Choose the game experience to launch. Additional options will appear after selection.
            </p>
          </div>

          {isPoker && (
            <>
              <div className="mb-4">
                <label className="block text-gray-300 font-medium mb-2" htmlFor="maxPlayers">
                  Max Players
                </label>
                <input
                  type="number"
                  id="maxPlayers"
                  name="maxPlayers"
                  value={gameData.maxPlayers}
                  onChange={handleChange}
                  min={2}
                  max={10}
                  className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                {errors.maxPlayers && <p className="text-red-500 text-sm mt-1">{errors.maxPlayers}</p>}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-300 font-medium mb-2" htmlFor="smallBlind">
                  Small Blind Amount
                </label>
                <input
                  type="number"
                  id="smallBlind"
                  name="smallBlind"
                  value={gameData.smallBlind}
                  onChange={handleChange}
                  min={1}
                  className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                {errors.smallBlind && <p className="text-red-500 text-sm mt-1">{errors.smallBlind}</p>}
                <p className="text-gray-400 text-sm mt-1">Big blind will be {gameData.smallBlind * 2}</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 font-medium mb-2" htmlFor="gameVariant">
                  Game Variant
                </label>
                <select
                  id="gameVariant"
                  name="gameVariant"
                  value={gameData.gameVariant}
                  onChange={handleChange}
                  className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="TexasHoldEm">Texas Hold'em</option>
                  <option value="Omaha">Omaha</option>
                  <option value="OmahaHiLo">Omaha Hi/Lo</option>
                  <option value="FiveCardDraw">Five Card Draw</option>
                  <option value="SevenCardStud">Seven Card Stud</option>
                  <option value="Chicago">Chicago</option>
                  <option value="DealersChoice">Dealer's Choice</option>
                </select>
                <p className="text-gray-400 text-sm mt-1">
                  {gameData.gameVariant === 'DealersChoice' ? 
                    "Dealer selects game variant each hand" : 
                    "All hands will use the selected variant"}
                </p>
              </div>
            </>
          )}

          {isPinochle && (
            <div className="mb-6">
              <label className="block text-gray-300 font-medium mb-2" htmlFor="wagerPerGame">
                Wager Per Game
              </label>
              <input
                type="number"
                id="wagerPerGame"
                name="wagerPerGame"
                value={gameData.wagerPerGame}
                onChange={handleChange}
                min={1}
                className="w-full border border-gray-600 bg-gray-700 text-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              {errors.wagerPerGame && <p className="text-red-500 text-sm mt-1">{errors.wagerPerGame}</p>}
              <p className="text-gray-400 text-sm mt-1">Each player pays this amount to enter the Pinochle table.</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 bg-red-700 rounded-md text-gray-300 hover:bg-red-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-800 text-white rounded-md hover:bg-green-500 transition-colors"
            >
              Create Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGameModal;
