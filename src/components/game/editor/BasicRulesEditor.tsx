const BasicRulesEditor = ({ variant, onChange }) => {
  const handlePocketCardChange = (field, value) => {
    onChange({
      ...variant,
      pocketCards: {
        ...variant.pocketCards,
        [field]: parseInt(value, 10)
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-medium">Variant Name</label>
          <input 
            type="text"
            className="w-full p-2 border rounded"
            value={variant.name}
            onChange={(e) => onChange({ ...variant, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Description</label>
          <input 
            type="text"
            className="w-full p-2 border rounded"
            value={variant.description || ''}
            onChange={(e) => onChange({ ...variant, description: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-medium">Pocket Cards</label>
          <input 
            type="number" 
            min="0" 
            max="10"
            className="w-full p-2 border rounded"
            value={variant.pocketCards.count}
            onChange={(e) => handlePocketCardChange('count', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Must Use</label>
          <input 
            type="number" 
            min="0" 
            max={variant.pocketCards.count}
            className="w-full p-2 border rounded"
            value={variant.pocketCards.mustUse}
            onChange={(e) => handlePocketCardChange('mustUse', e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="checkbox"
          id="allowDiscards"
          checked={variant.allowDiscards}
          onChange={(e) => onChange({ ...variant, allowDiscards: e.target.checked })}
        />
        <label htmlFor="allowDiscards">Allow Discards</label>
      </div>

      <div className="flex items-center space-x-2">
        <input 
          type="checkbox"
          id="enableCommunity"
          checked={variant.communityCards.enabled}
          onChange={(e) => onChange({ 
            ...variant, 
            communityCards: {
              ...variant.communityCards,
              enabled: e.target.checked
            }
          })}
        />
        <label htmlFor="enableCommunity">Enable Community Cards</label>
      </div>
    </div>
  );
};

export default BasicRulesEditor;