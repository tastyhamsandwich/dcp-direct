import React from 'react'

const WhatIsPinochle = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        What Is Pinochle?
      </h1>
      <p className="m-2 p-2 pr-8">
        Pinochle is a trick-taking card game for two to four players, most often
        played with a 48-card deck made from two copies of a standard 24-card
        set (9 through Ace). The game blends bidding, melding, and trick play to
        score points over several hands.
      </p>
      <p className="m-2 p-2 pr-8">
        Players bid to declare a trump suit, reveal melds for bonus points, and
        then play tricks to reach their contract. Teamwork, card counting, and
        timing your melds are key to consistent wins.
      </p>
    </div>
  );
};

export default WhatIsPinochle;
