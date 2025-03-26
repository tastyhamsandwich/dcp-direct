"use client";

import React, { useState } from 'react';
import { Player } from '@game/pokerLogic';

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
      [name]: name === 'name' ? value : parseInt(value)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
              Game Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={gameData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Poker Table"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="maxPlayers">
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.maxPlayers && <p className="text-red-500 text-sm mt-1">{errors.maxPlayers}</p>}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="smallBlind">
              Small Blind Amount
            </label>
            <input
              type="number"
              id="smallBlind"
              name="smallBlind"
              value={gameData.smallBlind}
              onChange={handleChange}
              min={1}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.smallBlind && <p className="text-red-500 text-sm mt-1">{errors.smallBlind}</p>}
            <p className="text-gray-500 text-sm mt-1">Big blind will be {gameData.smallBlind * 2}</p>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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