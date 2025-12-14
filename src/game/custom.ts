import { Card } from './classes';
import { FlopArray, TurnRiverArray } from './types';

type Id = SectionId | FlopId | TurnRiverId | SoloCardId | GroupId | GenericId;
type GenericId = `id${number}`;
type SectionId = `sec${number}`;
type FlopId = `f${number}`;
type TurnRiverId = `tr${number}`;
type SoloCardId = `s${number}`;
type GroupId = `grp${number}`;

type TurnCard = Card;
type RiverCard = Card;
type FlopCard = Card;




interface Flop {
  cards: FlopArray;
  id: FlopId;
  connectedTo: TurnRiverId[] | SoloCardId[];
}

interface TurnRiver {
  turn: TurnCard;
  river: RiverCard;
  cards: TurnRiverArray;
  id: TurnRiverId;
  connnectedTo: FlopId[] | SoloCardId[];
}

interface SoloCard {
  cards: Card;
  id: SoloCardId;
  connectedTo: FlopId[] | SoloCardId[] | TurnRiver[];
}

interface Section {
  flop: Flop | SoloCard[];
  turn: TurnRiver | SoloCard;
  river: TurnRiver | SoloCard;
  id: SectionId;
}

class PlayableGroup {
  cards: Card[];
  members: Array<Flop | TurnRiver | SoloCard>;
  id: GroupId;

  constructor([...members]: Array<Flop | TurnRiver | SoloCard>) {
    this.members = members;
    this.cards = members.map((member) => member.cards).flat();
    this.id = randomId('group') as GroupId;
  }
}

/** Generates a random ID string with a specified prefix. 
 * The prefix is determined by the type parameter.
 * @param {string} type - Prefix for the ID.
 * - 'flop' for flop cards ('f')
 * - 'turnriver' for turn and river cards ('tr)
 * - 'solo' for solo cards ('s')
 * - 'section' for sections ('sec')
 * - 'group' for groups of cards ('grp')
 * - 'id' is used if param is omitted or invalid ('id')
 * @returns {string} - A random ID string with the specified prefix and a random number.
 * @example 
 * const flopId = randomId('flop'); // e.g., 'f12345'
 * const turnRiverId = randomId('turnriver'); // e.g., 'tr67890'
 * const soloId = randomId('solo'); // e.g., 's54321'
 * const sectionId = randomId('section'); // e.g., 'sec98765'
 * const groupId = randomId('group'); // e.g., 'grp13579'
 * const defaultId = randomId(); // e.g., 'id24680'
 * const invalidId = randomId('invalid'); // e.g., 'id86420'
 */
function randomId(type?: string): Id {
  const idNum = parseInt((Math.random() * 100000).toFixed(0));
  if (type === 'flop')
    return `f${idNum}` as FlopId;
  else if (type === 'turnriver')
    return `tr${idNum}` as TurnRiverId;
  else if (type === 'solo')
    return `s${idNum}` as SoloCardId;
  else if (type === 'section')
    return `sec${idNum}` as SectionId;
  else if (type === 'group')
    return `grp${idNum}` as GroupId;
  else
    return `id${idNum}` as GenericId;
  }