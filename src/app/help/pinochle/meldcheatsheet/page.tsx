import React from 'react'

const PinochleMeldCheatSheet = () => {
  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-full max-w-3xl border-lg text-lg text-shadow-md text-shadow-black rounded-xl">
      <h1 className="m-2 p-4 text-white text-4xl underline text-shadow-2xl text-shadow-black">
        Meld Cheat Sheet
      </h1>
      <p className="m-2 p-2 pr-8">
        Use this page as a quick reference for common melds like runs, marriages,
        pinochles, and arounds. Point values can vary by variant, so check the
        rules for your table.
      </p>
      <p className="m-2 p-2 pr-8">
        Remember: melds score only if you can legally declare them after trump
        is set, and each card can typically count toward a limited number of
        melds depending on the rules.
      </p>
    </div>
  );
};

export default PinochleMeldCheatSheet;
