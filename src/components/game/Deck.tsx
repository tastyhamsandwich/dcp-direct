import React from 'react'
import Image from 'next/image';
import { format } from 'path';

const Deck = ({ scaleFactor }) => {

  const baseDeckWidth = 152;
  const baseDeckHeight = 222;

  const finalDeckWidth = (baseDeckWidth / 2) * scaleFactor;
  const finalDeckHeight = (baseDeckHeight / 2) * scaleFactor;
return <Image src="/assets/carddeck.png" width={finalDeckWidth} height={finalDeckHeight} alt="The deck of cards." />;
}

export default Deck;