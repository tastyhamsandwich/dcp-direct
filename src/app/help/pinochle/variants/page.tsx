import React from 'react'

const PinochleVariants = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        Variants
      </h1>
      <p className="m-2 p-2 pr-8">
        Popular variants include partnership pinochle, double deck, and
        three-hand or two-hand versions with different dealing and melding
        rules. Some tables use different scoring or trick thresholds.
      </p>
      <p className="m-2 p-2 pr-8">
        Before you play, confirm the deck, meld values, and bid targets so
        everyone shares the same expectations.
      </p>
    </div>
  );
};

export default PinochleVariants;
