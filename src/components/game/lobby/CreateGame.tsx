import React from 'react'

const CreateGameButton = ({formAction}) => {

  return (
    <button className="btn btn-primary bg-sky-700 rounded-lg shadow-xl text-white p-2" onClick={(formAction)}>
      Create Game
    </button>
  );
}

export default CreateGameButton;