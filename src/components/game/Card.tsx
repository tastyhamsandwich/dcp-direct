import React from 'react';

const Card = ({ rank, suit, faceDown = false }) => {
  if (faceDown) {
    return (
      <div className="card card-back">
        <div className="card-back-design"></div>
      </div>
    );
  }

  const suitSymbol = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  const color = ['hearts', 'diamonds'].includes(suit) ? 'text-red-600' : 'text-black';

  return (
    <div className="card bg-white rounded-lg shadow-md border border-gray-300 w-16 h-24 flex flex-col justify-between p-2">
      <div className={`text-left ${color}`}>{rank}</div>
      <div className={`text-center text-2xl ${color}`}>{suitSymbol[suit]}</div>
      <div className={`text-right ${color}`}>{rank}</div>
    </div>
  );
};

export default Card;