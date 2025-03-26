import React from 'react';

interface CreateGameButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const CreateGameButton: React.FC<CreateGameButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled}
      onClick={onClick}
    >
      Create New Game
    </button>
  );
};

export default CreateGameButton;