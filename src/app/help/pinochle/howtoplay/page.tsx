import React from 'react'

const PinochleHowToPlay = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        The Basics
      </h1>
      <p className="m-2 p-2 pr-8">
        Pinochle hands generally follow this flow: deal, bid, declare trump,
        reveal melds, and play tricks. The high-level goal is to score points
        from both melds and tricks to meet or exceed the contract.
      </p>
      <p className="m-2 p-2 pr-8">
        In partnership play, teammates share information through bidding and
        coordinate trump strength. In two-player variants, hand management and
        timing your melds become even more important.
      </p>
    </div>
  );
};

export default PinochleHowToPlay;
