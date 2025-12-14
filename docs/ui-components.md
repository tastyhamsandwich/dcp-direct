# UI Components

DCP Direct uses a component-based UI architecture with Tailwind CSS for styling. Components are organized by function and feature to create a maintainable and consistent user interface.

## Component Organization

The UI components are organized in the following structure:

```
/src/components/
├── auth/           # Authentication-related components
│   ├── Login.tsx
│   └── Register.tsx
├── forms/          # Form components and inputs
│   ├── FormMessage.tsx
│   ├── Inputs.tsx
│   └── SubmitButton.tsx
├── game/           # Game-specific components
│   ├── Actions.tsx
│   ├── Card.tsx
│   ├── CardGame.tsx
│   ├── Deck.tsx
│   ├── GameState.tsx
│   ├── Player.tsx
│   ├── Table.tsx
│   └── Timer.tsx
├── nav/            # Navigation components
│   ├── NavBar.tsx
│   ├── NavLinks.tsx
│   ├── NavLogin.tsx
│   ├── NavProfile.tsx
│   └── NavRight.tsx
└── ui/             # Generic UI components
    ├── Badge.tsx
    ├── Button.tsx
    ├── Chat.tsx
    ├── Checkbox.tsx
    ├── DropdownMenu.tsx
    ├── Input.tsx
    ├── Label.tsx
    ├── Leaderboard.tsx
    ├── Lobby.tsx
    └── Settings.tsx
```

## Core UI Components

### Button Component

The Button component is a fundamental UI element used throughout the application:

```tsx
// src/components/ui/Button.tsx (simplified)
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Button variants defined with class-variance-authority
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### Input Component

The Input component for form fields:

```tsx
// src/components/ui/Input.tsx (simplified)
import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

## Form Components

### Form Inputs with Validation

Form components with built-in validation:

```tsx
// src/components/forms/Inputs.tsx (simplified)
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { FormMessage } from './FormMessage';

interface FormInputProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

export function FormInput({
  name,
  label,
  placeholder,
  type = 'text',
  required = false,
}: FormInputProps) {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
      />
      {errors[name] && <FormMessage>{errors[name]?.message?.toString()}</FormMessage>}
    </div>
  );
}
```

### Submit Button

```tsx
// src/components/forms/SubmitButton.tsx (simplified)
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '../ui/Button';

interface SubmitButtonProps {
  children: React.ReactNode;
  isSubmitting?: boolean;
  className?: string;
}

export function SubmitButton({
  children,
  isSubmitting = false,
  className,
}: SubmitButtonProps) {
  const { formState } = useFormContext();
  
  return (
    <Button
      type="submit"
      className={className}
      disabled={isSubmitting || !formState.isValid}
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⟳</span> Processing...
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
```

## Game UI Components

### Card Component

The Card component represents a playing card:

```tsx
// src/components/game/Card.tsx (simplified)
import React from 'react';
import { Card as CardType } from '@lib/utils/gameLogic';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selectable?: boolean;
}

export function Card({ card, onClick, selectable = false }: CardProps) {
  const { suit, value, faceUp } = card;
  
  // Card suit symbols
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  
  // Card values (A, 2-10, J, Q, K)
  const valueDisplay = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K'
  }[value] || value.toString();
  
  // Card colors
  const isRed = suit === 'hearts' || suit === 'diamonds';
  
  if (!faceUp) {
    // Card back
    return (
      <div 
        className="w-16 h-24 rounded-md bg-blue-800 border-2 border-white shadow-md flex items-center justify-center"
        onClick={onClick}
      >
        <div className="text-white text-2xl">🂠</div>
      </div>
    );
  }
  
  return (
    <div 
      className={`w-16 h-24 rounded-md bg-white border border-gray-300 shadow-md flex flex-col p-1 ${
        selectable ? 'cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all' : ''
      }`}
      onClick={selectable ? onClick : undefined}
    >
      <div className={`text-sm ${isRed ? 'text-red-600' : 'text-black'}`}>
        {valueDisplay}
      </div>
      <div className={`text-xl flex-grow flex items-center justify-center ${isRed ? 'text-red-600' : 'text-black'}`}>
        {suitSymbols[suit]}
      </div>
      <div className={`text-sm self-end ${isRed ? 'text-red-600' : 'text-black'}`}>
        {valueDisplay}
      </div>
    </div>
  );
}
```

### Table Component

The Table component represents the game table:

```tsx
// src/components/game/Table.tsx (simplified)
import React from 'react';
import { GameState } from '@lib/utils/gameLogic';
import { Card } from './Card';
import { Player } from './Player';

interface TableProps {
  gameState: GameState;
  currentPlayerId: string;
  onAction: (action: string, amount?: number) => void;
}

export default function Table({ gameState, currentPlayerId, onAction }: TableProps) {
  const { players, phase, message } = gameState;
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  
  return (
    <div className="bg-green-800 rounded-xl p-4 shadow-xl relative">
      <div className="text-white text-center mb-4">{message}</div>
      
      {/* Center area / community cards */}
      <div className="flex justify-center gap-2 mb-8">
        {/* Any community cards would go here */}
      </div>
      
      {/* Other players */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {players
          .filter(p => p.id !== currentPlayerId)
          .map(player => (
            <Player 
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === gameState.currentPlayerId}
            />
          ))}
      </div>
      
      {/* Current player */}
      {currentPlayer && (
        <div className="bg-green-700 rounded-lg p-2">
          <Player 
            player={currentPlayer}
            isCurrentPlayer={currentPlayer.id === gameState.currentPlayerId}
            showCards={true}
          />
          
          {/* Action buttons */}
          {phase === 'playing' && currentPlayer.id === gameState.currentPlayerId && (
            <div className="flex justify-center gap-2 mt-4">
              <button 
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => onAction('playCard')}
              >
                Play Card
              </button>
              {/* Other actions */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Navigation Components

### NavBar Component

The main navigation bar:

```tsx
// src/components/nav/NavBar.tsx (simplified)
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@contexts/authContext';
import NavLinks from './NavLinks';
import NavProfile from './NavProfile';
import NavLogin from './NavLogin';

export default function NavBar() {
  const { user, loading } = useAuth();
  
  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">
            DCP Direct
          </Link>
          <NavLinks />
        </div>
        
        <div className="flex items-center">
          {!loading && (
            user ? <NavProfile /> : <NavLogin />
          )}
        </div>
      </div>
    </nav>
  );
}
```

## Composite Components

### Lobby Component

The game lobby component:

```tsx
// src/components/ui/Lobby.tsx (simplified)
import React, { useState } from 'react';
import { Button } from './Button';

interface GameInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isStarted: boolean;
}

interface LobbyProps {
  games: GameInfo[];
  onCreateGame: (settings: any) => void;
  onJoinGame: (gameId: string) => void;
  username: string;
}

export default function Lobby({ games, onCreateGame, onJoinGame, username }: LobbyProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  
  const handleCreateGame = () => {
    onCreateGame({
      name: gameName || `${username}'s Game`,
      maxPlayers
    });
    setShowCreateForm(false);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Welcome, {username}</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create Game'}
        </Button>
      </div>
      
      {showCreateForm ? (
        <div className="mb-6 bg-gray-100 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-4">Create New Game</h3>
          <div className="space-y-3">
            <div>
              <label className="block mb-1">Game Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={`${username}'s Game`}
              />
            </div>
            <div>
              <label className="block mb-1">Max Players</label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              >
                {[2, 3, 4, 6, 8].map(num => (
                  <option key={num} value={num}>{num} Players</option>
                ))}
              </select>
            </div>
            <Button onClick={handleCreateGame}>Create Game</Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-medium mb-3">Available Games</h3>
          {games.length > 0 ? (
            <div className="space-y-2">
              {games.map(game => (
                <div 
                  key={game.id} 
                  className="flex justify-between items-center p-3 bg-gray-100 rounded hover:bg-gray-200"
                >
                  <div>
                    <div className="font-medium">{game.name}</div>
                    <div className="text-sm text-gray-600">
                      Players: {game.playerCount}/{game.maxPlayers}
                    </div>
                  </div>
                  <Button
                    onClick={() => onJoinGame(game.id)}
                    disabled={game.playerCount >= game.maxPlayers || game.isStarted}
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 py-8 text-center">
              No games available. Why not create one?
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## Component Design Philosophy

The UI components in DCP Direct follow these design principles:

1. **Composition**: Small, focused components that can be composed together
2. **Reusability**: Generic UI components that can be used in multiple contexts
3. **Separation of Concerns**: UI separate from business logic
4. **Type Safety**: TypeScript interfaces for props
5. **Responsive Design**: Mobile-first approach with Tailwind CSS
6. **Accessibility**: Proper semantic HTML and ARIA attributes

## Styling Approach

The application uses Tailwind CSS for styling with the following approach:

1. **Utility-First**: Using Tailwind utility classes for most styling
2. **Component Variants**: Using class-variance-authority for component variants
3. **Custom Classes**: Minimal custom CSS where needed
4. **Consistent Colors**: Using Tailwind theme colors
5. **Responsive Design**: Using Tailwind's responsive modifiers