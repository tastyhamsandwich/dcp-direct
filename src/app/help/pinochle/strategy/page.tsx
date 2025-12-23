import React from 'react'

const PinochleStrategy = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        Strategy
      </h1>
      <p className="m-2 p-2 pr-8">
        Track trump, manage entries, and preserve key winners. Try to take
        control of the lead when you can cash long suits or secure your partner's
        meld value.
      </p>
      <p className="m-2 p-2 pr-8">
        In defense, aim to shorten trump, force high cards early, and disrupt
        the declarer's plan by leading suits that drain their resources.
      </p>
    </div>
  );
};

export default PinochleStrategy;
