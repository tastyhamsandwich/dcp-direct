import React from 'react'

const PinochleBiddingGuide = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        Bidding Guide
      </h1>
      <p className="m-2 p-2 pr-8">
        Bidding communicates strength, meld potential, and trump preference. Use
        your hand to estimate likely meld points plus trick-taking power, then
        bid confidently within that range.
      </p>
      <p className="m-2 p-2 pr-8">
        In partnership play, pay attention to your partner's bids and avoid
        overbidding when support is unclear. In two-player variants, bidding is
        more direct and often lower.
      </p>
    </div>
  );
};

export default PinochleBiddingGuide;
