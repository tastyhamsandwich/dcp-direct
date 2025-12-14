import { PokerVariant, CommunityCardsConfig } from './exampleVariantTypes';

function processVariant(variantData: any): void {
  // Assume variantData is fetched JSON, potentially unsafe 'any' type
  const variant = variantData as PokerVariant; // Cast (use validation library for safety)

  console.log(variant.variantName);
  console.log(variant.gameRules.holeCardsDealt);

  if (variant.communityCards.useCommunityCards) {
    // Type guard automatically narrows type to CommunityCardsConfig here
    const communityConfig = variant.communityCards;
    console.log('Grid dimensions:', communityConfig.grid.length, 'x', communityConfig.grid[0].length);

    communityConfig.playableGroupRules.forEach(rule => {
      console.log(`Rule Name: ${rule.name}, Type: ${rule.ruleType}`);
      if (rule.ruleType === 'adjacent_cells') {
        console.log(`  Adjacency: ${rule.adjacencyType}`);
      } else if (rule.ruleType === 'predefined_sections') {
        console.log(`  Sections: ${rule.sectionIds.join(', ')}`);
      }
    });
  } else {
    console.log('No community cards used.');
  }

  if (variant.handFormationRule.type === 'omaha_exact') {
     console.log(`Omaha Style Hand: Use ${variant.handFormationRule.requiredHoleCards} hole cards.`);
  } else {
     console.log(`Hold'em Style Hand: Use up to ${variant.handFormationRule.maxHoleCardsToUse} hole cards.`);
  }
}