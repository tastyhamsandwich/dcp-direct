"use client";

import React, { useState } from 'react';
import { Player } from '@game/types';

interface CreateGameModalProps {
  onClose: () => void;
  onSubmit: (gameData: any) => void;
  player: Player;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({ onClose, onSubmit, player }) => {
  const [gameData, setGameData] = useState({
    name: '',
    maxPlayers: 6,
    smallBlind: 5
  });

  const [errors, setErrors] = useState({
    name: '',
    maxPlayers: '',
    smallBlind: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGameData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseInt(value) || 0
    }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { ...errors };

    if (!gameData.name.trim()) {
      newErrors.name = 'Game name is required';
      valid = false;
    }

    if (gameData.maxPlayers < 2 || gameData.maxPlayers > 10) {
      newErrors.maxPlayers = 'Max players must be between 2 and 10';
      valid = false;
    }

    if (gameData.smallBlind < 1) {
      newErrors.smallBlind = 'Small blind must be at least 1';
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
              placeholder="My Poker Table"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          
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
          
          <div className="mb-6">
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