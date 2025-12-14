import { useState } from 'react';
import { Button } from '@comps/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comps/ui/Tabs';
import { Card } from '@comps/ui/Card';
import { Save, Play } from 'lucide-react';
import BasicRulesEditor from './BasicRulesEditor';
import GridEditor from './GridEditor';
import HandFormationEditor from './HandFormationEditor';
import { GameVariant } from '../../../game/editorTypes';

const PokerVariantEditor = () => {
  const [variant, setVariant] = useState<GameVariant>({
    name: 'New Variant',
    description: '',
    pocketCards: {
      count: 2,
      mustUse: 0
    },
    allowDiscards: false,
    wildCards: [],
    communityCards: {
      enabled: true,
      grid: [],
      dealPhases: [
        { name: 'flop', cellPositions: [] },
        { name: 'turn', cellPositions: [] },
        { name: 'river', cellPositions: [] }
      ],
      handFormation: {
        ruleType: 'adjacent',
        adjacencyRules: {
          requireCount: 5,
          includeDiagonals: true,
          maxDistance: 1
        }
      }
    }
  });
  
  const saveVariant = () => {
    // In a real app, you'd save to a database or localStorage
    console.log('Saving variant:', variant);
    alert('Variant saved!');
  };
  
  const testVariant = () => {
    // In a real app, you'd navigate to a test page
    console.log('Testing variant:', variant);
    alert('This would navigate to a test page for this variant.');
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Poker Variant Editor</h1>
      
      <div className="flex justify-end space-x-2 mb-6">
        <Button onClick={saveVariant} className="flex items-center">
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button onClick={testVariant} className="flex items-center">
          <Play className="mr-2 h-4 w-4" />
          Test
        </Button>
      </div>
      
      <Card className="mb-6">
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="basic">Basic Rules</TabsTrigger>
            <TabsTrigger value="grid">Community Cards</TabsTrigger>
            <TabsTrigger value="rules">Hand Formation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="p-6">
            <BasicRulesEditor variant={variant} onChange={setVariant} />
          </TabsContent>
          
          <TabsContent value="grid" className="p-6">
            <GridEditor variant={variant} onChange={setVariant} />
          </TabsContent>
          
          <TabsContent value="rules" className="p-6">
            <HandFormationEditor variant={variant} onChange={setVariant} />
          </TabsContent>
        </Tabs>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80">
          {JSON.stringify(variant, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default PokerVariantEditor;