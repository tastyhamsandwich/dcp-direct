// Basic Types and Enums

/** Defines the type of community card section */
export type SectionType = 'flop' | 'turn' | 'river';

/** Defines the rule for determining wild cards */
export type WildCardRule = 'none' | 'jokers' | 'deuces' | string; // Allows specific known types or custom string rule

/** Defines how adjacency is determined for 'adjacent_cells' rule */
export type AdjacencyType = 'orthogonal' | 'orthogonal_or_diagonal';

/** Defines the type of rule used to form the final player hand */
export type HandFormationType = 'omaha_exact' | 'holdem_best_5';

/** Defines the type of rule used to determine valid community card groups */
export type PlayableGroupRuleType = 'predefined_sections' | 'adjacent_cells';

// Grid and Section Definitions

/** Represents a single cell within the community card grid */
export interface GridCell {
  type: SectionType;
  /** Identifier linking this cell to its logical Section */
  sectionId: string;
}

/** Represents a 5-element row for the community card grid */
export type GridRow = [GridCell | null, GridCell | null, GridCell | null, GridCell | null, GridCell | null];

/** Represents the 5x5 community card grid structure */
export type Grid = [GridRow, GridRow, GridRow, GridRow, GridRow];

/** Defines a logical section of community cards (Flop, Turn, or River) */
export interface Section {
  /** Unique identifier for this section (referenced by GridCells and PlayableGroupRules) */
  id: string;
  type: SectionType;
  /** Number of cards this section contributes (e.g., 3 for a standard Flop section, 1 for Turn/River) */
  cardCount: number;
  /** Determines the reveal timing and betting round (e.g., 1=Flop, 2=Turn, 3=River) */
  revealOrder: number;
}

// Playable Group Rule Definitions (Discriminated Union)

/** Base interface for all playable group rules */
export interface BasePlayableGroupRule {
  ruleType: PlayableGroupRuleType;
  /** User-friendly name for this rule/grouping */
  name: string;
}

/** Rule defining a playable group by specific, predefined section IDs */
export interface PredefinedSectionsRule extends BasePlayableGroupRule {
  ruleType: 'predefined_sections';
  /** An array of Section IDs that must be used together to form a valid group */
  sectionIds: string[];
}

/** Rule defining playable groups based on spatial adjacency on the grid */
export interface AdjacentCellsRule extends BasePlayableGroupRule {
  ruleType: 'adjacent_cells';
  /** The number of adjacent cells required to form a group (typically 5) */
  count: 5;
  /** How adjacency is defined (including diagonals or not) */
  adjacencyType: AdjacencyType;
  /** Scope of the adjacency rule (currently only 'grid_wide') */
  appliesTo: 'grid_wide'; // Could be expanded later (e.g., 'zone_a')
}

/** Union type representing any possible rule for forming playable community card groups */
export type PlayableGroupRule = PredefinedSectionsRule | AdjacentCellsRule;

// Hand Formation Rule Definitions (Discriminated Union)

/** Rule where player MUST use an exact number of hole and community cards (e.g., Omaha) */
export interface OmahaExactHandRule {
  type: 'omaha_exact';
  /** The exact number of hole cards the player must use */
  requiredHoleCards: number;
  /** The exact number of community cards the player must use (should be 5 - requiredHoleCards) */
  requiredCommunityCards: number;
}

/** Rule where player makes the best 5-card hand from total available, up to a max from hole cards (e.g., Hold'em) */
export interface HoldemBest5HandRule {
  type: 'holdem_best_5';
  /** The maximum number of hole cards the player can use (implies 0 to max) */
  maxHoleCardsToUse: number;
}

/** Union type representing any possible rule for forming the final 5-card hand */
export type HandFormationRule = OmahaExactHandRule | HoldemBest5HandRule;

// Core Variant Structure Interfaces

/** Defines the basic game rules regarding player hands */
export interface GameRules {
  /** Number of hole cards dealt to each player */
  holeCardsDealt: number;
  /** Whether discarding and drawing cards is allowed */
  allowDiscards: boolean;
  /** Rule determining which cards, if any, are wild */
  wildCardRule: WildCardRule;
}

/** Configuration specific to variants that use community cards */
export interface CommunityCardsConfig {
  useCommunityCards: true;
  /** The 5x5 grid structure */
  grid: Grid;
  /** Array defining all logical sections placed on the grid */
  sections: Section[];
  /** Array defining the rules for forming valid 5-card community groups */
  playableGroupRules: PlayableGroupRule[];
}

/** Configuration specific to variants that do NOT use community cards */
export interface NoCommunityCardsConfig {
  useCommunityCards: false;
}

/** Top-level interface representing a complete custom Poker Game Variant */
export interface PokerVariant {
  /** Unique identifier for the variant */
  variantId: string;
  /** User-defined name for the variant */
  variantName: string;
  /** Optional longer description of the variant */
  description?: string; // Made optional for simplicity
  /** Optional identifier of the user who created the variant */
  createdBy?: string;
  /** Optional date of creation (ISO 8601 string format recommended) */
  creationDate?: string;

  /** Basic rules governing player hands and wilds */
  gameRules: GameRules;

  /** Configuration for community cards (present if useCommunityCards is true) */
  communityCards: CommunityCardsConfig | NoCommunityCardsConfig; // Union type

  /** Rule defining how the final 5-card hand is constructed */
  handFormationRule: HandFormationRule;
}