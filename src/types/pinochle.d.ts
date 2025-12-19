declare global {
  type TeamId = "A" | "B";
  type PinochleTrickCard = { playerId: string; card: Card };
  type PinochleTrickState = { leadSuit: Suit | null; cards: PinochleTrickCard[] };
  type MeldCount = {
    acesAround: number;
    kingsAround: number;
    queensAround: number;
    jacksAround: number;
    pinochles: number;
    trumpRuns: number;
    marriages: {
      spades: number;
      clubs: number;
      hearts: number;
      diamonds: number;
    };
  };
  
  type PinochlePlayerState = {
    id: string;
    username: string;
    seatNumber: number;
    team: TeamId;
    ready: boolean;
    cards: PinochleCard[];
    tricksWon: number;
    meldScore: number;
    meldCards: PinochleCard[];
    totalScore: number;
    passedBid: boolean;
    roundPoints: number;
  };
  
  type PinochleGame = {
    id: string;
    name: string;
    players: PinochlePlayerState[];
    phase: "waiting" | "dealing" | "bid" | "playing" | "scoring" | "postgame";
    status?: string;
    dealerIndex: number;
    dealerId?: string;
    activePlayerId?: string;
    activePlayerIndex?: number;
    roundBid: number;
    bidLeaderId?: string;
    biddingTeam?: TeamId;
    trumpSuit?: Suit | null;
    deck: PinochleDeck;
    trick: PinochleTrickState;
    scoreTeamA: number;
    scoreTeamB: number;
    meldTeamA: number;
    meldTeamB: number;
    trickPointsTeamA: number;
    trickPointsTeamB: number;
    setsTeamA: number;
    setsTeamB: number;
    roundNumber: number;
    roundActive: boolean;
    wagerPerGame?: number;
  };


  type PinochleGamePhase = "waiting" | "bid" | "meld" | "game" | "postgame";
  type PinochleSeat = [1 | 2 | 3 | 4];
  type PinochleCards = 'AS' | 'AC' | 'AH' | 'AD' | 'TS' | 'TC' | 'TH' | 'TD' | 'KS' | 'KC' | 'KH' | 'KD' | 'QS' | 'QC' | 'QH' | 'QD' | 'JS' | 'JC' | 'JH' | 'JD';
  type PinochleTeam = 'teamOne' | 'teamTwo';
  type PinochleRoomStatus = 'waitingForPlayers' | 'gameInProgress' | 'gameEnding';
  type MeldCount = {
    acesAround: number,
    kingsAround: number,
    queensAround: number,
    jacksAround: number,
    pinochles: number,
    trumpRuns: number,
    marriages: {
      spades: number,
      clubs: number,
      hearts: number,
      diamonds: number
    }
  }
  
  interface PinochleTableSeats {
    seatOne: PinochlePlayer | null;
    seatTwo: PinochlePlayer | null;
    seatThree: PinochlePlayer | null;
    seatFour: PinochlePlayer | null;
  }
  
  type teamOne = 'seatOne' | 'seatThree';
  type teamTwo = 'seatTwo' | 'seatFour';
  
  interface PinochleGameState {
    id: string;
    players: PinochlePlayer[];
    teamOnePlayers: PinochlePlayer[];
    teamTwoPlayers: PinochlePlayer[];
    teamOneScore: number;
    teamTwoScore: number;
    roundBid?: number;
    roundBidTaker?: PinochlePlayer;
    biddingTeam?: PinochleTeam;
    trumpSuit?: Suit;
    roundNumber?: number;
    phase?: PinochleGamePhase;
    activePlayerId?: string;
    activePlayerIndex?: number;
  }
  
  
}

export {};
