import React from 'react'
import { Button } from '@comps/ui/Button';

const HandFormationEditor = ({ variant, onChange }) => {
  const handleRuleTypeChange = (ruleType) => {
    const updatedVariant = {
      ...variant,
      communityCards: {
        ...variant.communityCards,
        handFormation: {
          ruleType,
          // Add default values based on rule type
          ...(ruleType === 'adjacent' ? {
            adjacencyRules: {
              requireCount: 5,
              includeDiagonals: true,
              maxDistance: 1
            }
          } : {}),
          ...(ruleType === 'fixed' ? {
            playableGroups: []
          } : {})
        }
      }
    };
    
    onChange(updatedVariant);
  };
  
  const updateAdjacencyRules = (field, value) => {
    const updatedVariant = {
      ...variant,
      communityCards: {
        ...variant.communityCards,
        handFormation: {
          ...variant.communityCards.handFormation,
          adjacencyRules: {
            ...variant.communityCards.handFormation.adjacencyRules,
            [field]: typeof value === 'string' ? parseInt(value, 10) : value
          }
        }
      }
    };
    
    onChange(updatedVariant);
  };
  
  const { ruleType } = variant.communityCards.handFormation;
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium mb-2">Hand Formation Rule Type</label>
        <div className="flex space-x-2">
          <Button 
            onClick={() => handleRuleTypeChange('fixed')}
            variant={ruleType === 'fixed' ? 'default' : 'outline'}
          >
            Fixed Groups
          </Button>
          <Button 
            onClick={() => handleRuleTypeChange('adjacent')}
            variant={ruleType === 'adjacent' ? 'default' : 'outline'}
          >
            Adjacent Cards
          </Button>
          <Button 
            onClick={() => handleRuleTypeChange('custom')}
            variant={ruleType === 'custom' ? 'default' : 'outline'}
          >
            Custom Rules
          </Button>
        </div>
      </div>
      
      {ruleType === 'adjacent' && (
        <div className="space-y-4 p-4 border rounded">
          <h3 className="font-medium">Adjacency Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block">Required Card Count</label>
              <input 
                type="number"
                min="1"
                max="25"
                className="w-full p-2 border rounded"
                value={variant.communityCards.handFormation.adjacencyRules?.requireCount || 5}
                onChange={(e) => updateAdjacencyRules('requireCount', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block">Max Distance</label>
              <input 
                type="number"
                min="1"
                max="10"
                className="w-full p-2 border rounded"
                value={variant.communityCards.handFormation.adjacencyRules?.maxDistance || 1}
                onChange={(e) => updateAdjacencyRules('maxDistance', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="includeDiagonals"
              checked={variant.communityCards.handFormation.adjacencyRules?.includeDiagonals || false}
              onChange={(e) => updateAdjacencyRules('includeDiagonals', e.target.checked)}
            />
            <label htmlFor="includeDiagonals">Include Diagonal Adjacency</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="restrictToPhase"
              checked={variant.communityCards.handFormation.adjacencyRules?.restrictToPhase || false}
              onChange={(e) => updateAdjacencyRules('restrictToPhase', e.target.checked)}
            />
            <label htmlFor="restrictToPhase">Restrict to Same Phase</label>
          </div>
        </div>
      )}
      
      {ruleType === 'fixed' && (
        <div className="space-y-4 p-4 border rounded">
          <h3 className="font-medium">Fixed Playable Groups</h3>
          <p className="text-sm text-gray-500">
            This UI would allow defining specific card groupings that are playable together.
            This is a more complex part that would need a detailed implementation.
          </p>
          {/* Placeholder for a more complex group editor */}
        </div>
      )}
      
      {ruleType === 'custom' && (
        <div className="space-y-4 p-4 border rounded">
          <h3 className="font-medium">Custom Rules</h3>
          <p className="text-sm text-gray-500">
            This would allow defining custom rules through a more advanced interface.
          </p>
          {/* Placeholder for custom rule editor */}
        </div>
      )}
    </div>
  );
};

export default HandFormationEditor;