import React from 'react'
import './poker.module.css';

const WhatIsPoker = () => {

  return (
    <div className="p-5 bg-slate-700 text-slate-200 w-max border-lg text-lg text-shadow-md text-shadow-black inline-block rounded-xl">
      <h1 className="m-2 p-4 what-h1 text-white text-4xl underline text-shadow-2xl text-shadow-black justify-evenly align-middle">
        What Is Poker?
      </h1>
      <h2 className="m-2 p-2 text-white text-2xl underline text-shadow-lg text-shadow-black">
        Poker? I Hardly Even Know Her! - The Anatomy of Poker
      </h2>
      <span className="m-2 p-2 what-span pr-8">
        Poker is a family of comparing card games in which players wager over
        which hand is best according to that specific game's rules. It is played
        worldwide, with varying rules in different places. While the earliest
        known form of the game was played with just 20 cards, today it is
        usually played with a standard 52-card deck, although in countries where
        short packs are common, it may be played with 32, 40 or 48 cards. Thus
        poker games vary in deck configuration, the number of cards in play, the
        number dealt face up or face down and the number shared by all players,
        but all have rules that involve one or more rounds of betting.
      </span>
      <h2 className="m-2 text-white text-2xl underline text-shadow-lg text-shadow-black">
        Betting
      </h2>
      <span className="m-2 pr-8">
        In most modern poker games, the first round of betting begins with one
        or more of the players making some form of a forced bet (the blind or
        ante). In standard poker, each player bets according to the rank they
        believe their hand is worth as compared to the other players. The action
        then proceeds clockwise as each player in turn must either match (or
        "call") the maximum previous bet, or fold, losing the amount bet so far
        and all further involvement in the hand. A player who matches a bet may
        also "raise" (increase) the bet.
      </span>
      <h2 className="m-2 text-white text-2xl underline text-shadow-lg text-shadow-black">
        Round Progression
      </h2>
      <span className="m-2 p-4 pr-8">
        The betting round ends when all players have either called the last bet
        or folded. If all but one player folds on any round, the remaining
        player collects the pot without being required to reveal their hand. If
        more than one player remains in contention after the final betting
        round, a showdown takes place where the hands are revealed, and the
        player with the winning hand takes the pot. With the exception of
        initial forced bets, money is only placed into the pot voluntarily by a
        player who either believes the bet has a positive expected value or who
        is trying to bluff other players for various strategic reasons. Thus,
        while the outcome of any particular hand significantly involves chance,
        the long-run expectations of the players are determined by their actions
        chosen on the basis of probability, psychology and game theory.
      </span>

      <h2 className="m-2 text-white text-2xl underline text-shadow-lg text-shadow-black">
        Poker's Popularity
      </h2>
      <span className="m-2 p-4 pr-8">
        Poker has increased in popularity since the beginning of the 21st
        century, and has gone from being primarily a recreational activity
        confined to small groups of enthusiasts to a widely popular activity,
        both for participants and spectators, including online, with many
        professional players and multimillion-dollar tournament prizes.
      </span>
    </div>
  );
}

export default WhatIsPoker;