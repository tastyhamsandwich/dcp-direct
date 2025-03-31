import React from 'react';
import Image from 'next/image';
import { capitalize } from '@lib/utils';
import { rankToNumStr, suitNameToInitial } from '@game/utils';

const Card = ({ scaleFactor, rank, suit, faceDown = false }) => {

  const baseCardWidth = 142;
  const baseCardHeight = 212;

  const finalCardWidth = (baseCardWidth / 2) * scaleFactor;
  const finalCardHeight = (baseCardHeight / 2) * scaleFactor;
  // Convert 'four' to '4', 'spades' to 'S', etc...
  let rankNum: string = rankToNumStr(rank);
  let suitLetter: string = suitNameToInitial(suit);

  // Display just the card back image if it is supposed to be face down
  if (faceDown) {
    return (
      <Image src="/assets/cardback.png" width={finalCardWidth} height={finalCardHeight} alt="A playing card" />
    );
  }



  const color = ['hearts', 'diamonds'].includes(suit) ? 'text-red-600' : 'text-black';

  const cardSrc = `/assets/cards_en/${rankNum}${suitLetter}.png`;

  return <Image src={cardSrc} width={finalCardWidth} height={finalCardHeight} alt={`${capitalize(rank)} of ${capitalize(suit)}`} />;

  
};

export default Card;