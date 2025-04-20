interface GameVariant {
  // Basic game parameters
  name: string;
  description?: string;
  
  // Card distribution rules
  pocketCards: {
    count: number;       // How many cards dealt to each player
    mustUse: number;     // How many must be used in final hand
  };
  
  allowDiscards: boolean;
  wildCards: string[];   // Card identifiers that are wild, e.g. ["Js", "2h"]
  
  // Community card configuration
  communityCards: {
    enabled: boolean;
    grid: GridCell[][];  // 5x5 grid of cells
    playableGroups: PlayableGroup[]; // Valid card combinations
  };
}

interface PlayableGroup {
  name: string;          // For UI display
  cells: CellPosition[]; // References to grid positions
  
  // Optional: Define specific rules for card selection
  selectionRules?: {
    cardCount: number;    // Total cards available in this group
    maxSelect: number;    // Maximum cards selectable (typically 3 for community cards)
  };
}

interface CellPosition {
  row: number;
  col: number;
}

interface GridCell {
  type: "card" | "empty";
  cardCount: number;      // Usually 1, but could be 3 for a consolidated flop
  phase: "flop" | "turn" | "river" | null;  // The dealing phase this card belongs to
  groupId: string;        // To associate multi-cell flops
}

//?#####################################################################################################
//?#####################################################################################################
//?#####################################################################################################



// Example representation of your scenario
const exampleVariant = {
  name: "Row Choice",
  pocketCards: { count: 4, mustUse: 2 }, // Omaha style
  allowDiscards: false,
  wildCards: [],
  communityCards: {
    enabled: true,
    grid: [
      // Row 1: [F][T][R][ ][ ]
      // Row 2: [R][T][F][ ][ ]
      [
        { type: "flop", groupId: "flop1" },
        { type: "turn", groupId: "turn1" },
        { type: "river", groupId: "river1" },
        { type: "empty", groupId: "" },
        { type: "empty", groupId: "" }
      ],
      [
        { type: "river", groupId: "river2" },
        { type: "turn", groupId: "turn2" },
        { type: "flop", groupId: "flop2" },
        { type: "empty", groupId: "" },
        { type: "empty", groupId: "" }
      ],
      // remaining rows...
    ],
    playableGroups: [
      // Valid combinations
      {
        name: "Row 1 combo",
        cells: [
          { row: 0, col: 0 }, // flop1
          { row: 0, col: 1 }, // turn1
          { row: 0, col: 2 }  // river1
        ]
      },
      {
        name: "Row 2 combo",  
        cells: [
          { row: 1, col: 0 }, // river2
          { row: 1, col: 1 }, // turn2
          { row: 1, col: 2 }  // flop2
        ]
      },
      // More valid combinations...
    ]
  }
};

const consolidatedFlopsVariant = {
  name: "Consolidated Flops",
  // ... other properties the same
  communityCards: {
    enabled: true,
    grid: [
      [
        { type: "card", cardCount: 3, phase: "flop", groupId: "flop0" }, // Single cell with 3 cards
        { type: "card", cardCount: 1, phase: "turn", groupId: "turn0" },
        { type: "card", cardCount: 1, phase: "river", groupId: "river0" },
        { type: "empty", cardCount: 0, phase: null, groupId: "" },
        { type: "empty", cardCount: 0, phase: null, groupId: "" }
      ],
      // ... other rows
    ],
    // ... playable groups
  }
};

const alternatingFlopsVariant = {
  name: "Alternating Flops",
  pocketCards: { count: 4, mustUse: 2 },
  allowDiscards: false,
  wildCards: [],
  communityCards: {
    enabled: true,
    grid: [
      // Row 0: First 3 cards are flop
      [
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop0" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop0" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop0" },
        { type: "card", cardCount: 1, phase: "turn", groupId: "turn0" },
        { type: "card", cardCount: 1, phase: "river", groupId: "river0" }
      ],
      // Row 1: Last 3 cards are flop
      [
        { type: "card", cardCount: 1, phase: "river", groupId: "river1" },
        { type: "card", cardCount: 1, phase: "turn", groupId: "turn1" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop1" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop1" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop1" }
      ],
      // Row 2: First 3 cards are flop again
      [
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop2" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop2" },
        { type: "card", cardCount: 1, phase: "flop", groupId: "flop2" },
        { type: "card", cardCount: 1, phase: "turn", groupId: "turn2" },
        { type: "card", cardCount: 1, phase: "river", groupId: "river2" }
      ],
      // And so on...
    ],
    playableGroups: [
      // Row 0 valid combination
      {
        name: "Row 0 Combo",
        cells: [
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, // flop (3 cards)
          { row: 0, col: 3 }, // turn (1 card)
          { row: 0, col: 4 }  // river (1 card)
        ],
        selectionRules: {
          cardCount: 5, // Total cards available
          maxSelect: 3  // Player must select 3 of these 5 cards
        }
      },
      // Row 1 valid combination
      {
        name: "Row 1 Combo",
        cells: [
          { row: 1, col: 0 }, // river (1 card)
          { row: 1, col: 1 }, // turn (1 card)
          { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 } // flop (3 cards)
        ],
        selectionRules: {
          cardCount: 5,
          maxSelect: 3
        }
      },
      // Additional combinations...
    ]
  }
};

