import { ChangeStreamShardCollectionDocument } from 'mongodb';
import { Dialog } from 'radix-ui';
import * as React from 'react'

type CardSlot = {x: number, y: number};
type CommunityCards = Array<BoardRow | ReverseBoardRow>;

type FlopGroup = [CardSlot, CardSlot, CardSlot]
type TurnCard = CardSlot
type RiverCard = CardSlot
type TurnRiverGroup = [TurnCard, RiverCard]

type BoardRow = [FlopGroup, TurnCard, RiverCard] | [CardSlot, CardSlot, CardSlot, CardSlot, CardSlot] | [FlopGroup, TurnRiverGroup] | [CardSlot, CardSlot, CardSlot, TurnRiverGroup]
type ReverseBoardRow = [RiverCard, TurnCard, FlopGroup] | [CardSlot, CardSlot, CardSlot, CardSlot, CardSlot] | [TurnRiverGroup, FlopGroup] | [TurnRiverGroup, CardSlot, CardSlot, CardSlot]


const CustomGameEditor = () => {

  const handleAddFlop = () => {};

  const AddBoardRowDialog = () => (   
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="inline-flex h-[35px] items-center justify-center rounded bg-violet4 px-[15px] font-medium leading-none text-violet11 outline-none outline-offset-1 hover:bg-mauve3 focus-visible:outline-2 focus-visible:outline-violet6 select-none">
          Add Row to Board
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-blackA6 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-gray1 p-[25px] shadow-[var(--shadow-6)] focus:outline-none data-[state=open]:animate-contentShow">
            <Dialog.Title className="m-0 text-[17px] font-medium text-mauve12">
              Add Row to Board
            </Dialog.Title>
            <Dialog.Description className="mb-5 mt-2.5 text-[15px] leading-normal text-mauve11">
              Add a row of card slots to the community board.
            </Dialog.Description>
            <fieldset className="mb-[15px] flex items-center gap-5">
              <label className="w-[90px] text-right text-[15px] text-violet11" htmlFor="row">
                Add Flop
              </label>
              <button 
                className="inline-flex h-[35px] items-center justify-center rounded bg-green4 px-[15px] font-medium leading-none text-green11 outline-none outline-offset-1 hover:bg-green5 focus-visible:outline-2 focus-visible:outline-green6 select-none"
                onClick={handleAddFlop}
              >
                Add Flop
              </button>
            </fieldset>
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const GameVariantSettingsDialog = () => {

}

const GameInformationSettingsDialog = () => {

}

export default CustomGameEditor;