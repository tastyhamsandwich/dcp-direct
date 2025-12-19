declare global {
  interface GridCell {
    type: "card" | "empty";
    cardCount: number;
    phase: string | null;
    groupId: string;
  }

  interface CellPosition {
    row: number;
    col: number;
  }

  interface DealPhase {
    name: string;
    cellPositions: CellPosition[];
  }

  interface HandFormationRules {
    ruleType: "fixed" | "adjacent" | "custom";
    playableGroups?: PlayableGroup[];
    adjacencyRules?: {
      requireCount: number;
      includeDiagonals: boolean;
      maxDistance?: number;
      restrictToPhase?: boolean;
    };
  }

  interface PlayableGroup {
    name: string;
    cells: CellPosition[];
    selectionRules?: {
      cardCount: number;
      maxSelect: number;
    };
  }

  interface GameVariantSettings {
    name: string;
    description?: string;
    pocketCards: {
      count: number;
      mustUse: number;
    };
    allowDiscards: boolean;
    wildCards: string[];
    communityCards: {
      enabled: boolean;
      grid: GridCell[][];
      dealPhases: DealPhase[];
      handFormation: HandFormationRules;
    };
  }
}

export {};
