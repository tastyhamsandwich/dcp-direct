export interface GridCell {
  type: 'card' | 'empty';
  cardCount: number;
  phase: string | null;
  groupId: string;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface DealPhase {
  name: string;
  cellPositions: CellPosition[];
}

export interface HandFormationRules {
  ruleType: 'fixed' | 'adjacent' | 'custom';
  playableGroups?: PlayableGroup[];
  adjacencyRules?: {
    requireCount: number;
    includeDiagonals: boolean;
    maxDistance?: number;
    restrictToPhase?: boolean;
  };
}

export interface PlayableGroup {
  name: string;
  cells: CellPosition[];
  selectionRules?: {
    cardCount: number;
    maxSelect: number;
  };
}

export interface GameVariant {
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