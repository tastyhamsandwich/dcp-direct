"use client";

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router';
import CreateGameButton from '@comps/game/lobby/CreateGame';

const CreateGameModal = () => {

  const router = useRouter();

  const [nameValue, setNameValue] = useState<string>('');
  const [playersValue, setPlayersValue] = useState<number>(2);
  const [blindValue, setBlindValue] = useState<number>(5);
  const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(true);

  let nameSet, playersSet, blindSet = false;
  let formData = {
    name: 'My Game Room',
    maxPlayers: 10,
    blind: {
      small: 5,
      big: 10
    }
  }

  const handleNameChange = (event) => {
    const value = event.target.value;
    setNameValue(value);

    formData.name = value;
    nameSet = true;
  }

  const handlePlayerChange = (event) => {
    const value = parseInt(event.target.value);
    setPlayersValue(value);

    formData.maxPlayers = value;
    playersSet = true;
  }

  const handleBlindChange = (event) => {
    const value = parseInt(event.target.value);
    setBlindValue(value);

    formData.blind.small = value;
    formData.blind.big = value * 2;
    blindSet = true;
  }

  useEffect(() => {
    if (nameSet && playersSet && blindSet) {
      setIsButtonDisabled(false);
    } else {
      setIsButtonDisabled(true);
    }
  }, [nameSet, playersSet, blindSet]) 
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="p-8 border w-96 shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900">Create New Game</h3>
          <div className="mt-2 px-7 py-3">
            <form id="new-game-form">
              <label htmlFor="name">Game Name</label>
              <input type="text" id="name" name="name" min="3" max="20" value={nameValue} onChange={handleNameChange} required />
              <label htmlFor="max-players">Max Players</label>
              <input type="number" id="max-players" name="max-players" min="2" max="6" value={playersValue} onChange={handlePlayerChange} required />
              <label htmlFor="blind">Blind</label>
              <input type="number" id="blind" name="blind" min="5" max="100" value={blindValue} onChange={handleBlindChange} required />
            </form>
            <CreateGameButton settings={formData} disabled={isButtonDisabled} />
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={router.back}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGameModal;