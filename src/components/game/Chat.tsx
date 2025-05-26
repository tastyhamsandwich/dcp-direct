import React, { useState, useRef } from 'react';
import { type GameAction } from '@app/game/[gameId]/page';
import { useAuth } from "@contexts/authContext";
import { AnyMxRecord } from 'dns';
import { USER_COLORS, getUsernameColor } from '@lib/utils';
import { MessageSquareMore } from 'lucide-react';
import './chat.modules.css'

/* COMPONENTS:

  --Chat - text chat component that displays messages
  --ChatWrapper - wrapper component that contains the chat and the toggle button
  --ChatToggleButton - button that toggles the chat open and closed

  If you prefer the toggle button to be text instead of an icon, use:
  
  --ChatWrapperText - the wrapper component that contains the chat and the toggle button (text version)
  --ChatToggleButtonText - the button that toggles the chat open and closed (text version)

*/

type LobbyMessage = {
  sender: string;
  scope: "lobby";
  message: string;
};

type GameMessage = {
  sender: string;
  scope: "game";
  gameId: string;
  message: string;
}

type PrivateMessage = {
  sender: string;
  scope: "private";
  recipient: string;
  message: string;
}

type ChatMessage = LobbyMessage | GameMessage | PrivateMessage;

type ChatPayload = {
  privateMsg?: boolean;
  sender: string;
  message: string;
  timestamp: Date;
}

interface ChatProps {
  socket: any;
  scope: "game" | "lobby" | "private";
  gameId?: string;
  buttonText?: boolean;
}

const DraggableChat = ({
  socket,
  scope,
  gameId,
  buttonText = false,
}: ChatProps) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    setDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{ cursor: "grab", userSelect: "none" }}
      >
        {/* Drag handle, e.g. chat header */}
        <div style={{ background: "#222", color: "#fff", padding: "8px" }}>
          Chat
        </div>
      </div>
      <div>
        <ChatWrapper socket={socket} scope={scope} gameId={gameId} />
      </div>
    </div>
  );
};

export const ChatWrapper = ({ socket, scope, gameId, buttonText = false }: ChatProps) => {

  const [isOpen, setIsOpen] = React.useState(false);
  const { user, loading } = useAuth();
  const toggleChat = () => setIsOpen((prev) => !prev);

  const username = user?.username || "Unknown User";

  return (
    <div className={`w-18 h-28 chat-box fixed top-45 right-15 bg-gray-800 p-4 rounded-lg shadow-lg transition-transform duration-300 ${isOpen ? 'w-120 h-110 top-75 right-45 translate-y-0' : 'translate-y-full'}`}>
      { !buttonText ?
        <ChatToggleButton isOpen={isOpen} toggleChat={toggleChat} /> :
        <ChatToggleButtonText isOpen={isOpen} toggleChat={toggleChat} /> 
      }
      { isOpen && <Chat socket={socket} username={username} scope={scope} gameId={gameId ?? ""}/> }
    </div>
  );
}

export const ChatWrapperText = ({ socket, scope, gameId }) => {

  const [isOpen, setIsOpen] = React.useState(false);
  const { user, loading } = useAuth();
  const toggleChat = () => setIsOpen((prev) => !prev);

  const username = user?.username || "Unknown User";

  return (
    <div className={`fixed text-shadow-stone-800 bottom-0 right-0 w-full h-64 bg-gray-800 p-4 rounded-lg shadow-lg transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
      <ChatToggleButtonText isOpen={isOpen} toggleChat={toggleChat} />
      { isOpen && <Chat socket={socket} username={username} scope={scope} gameId={gameId} /> }
    </div>
  );
}

export const ChatToggleButton = ({ isOpen, toggleChat }: { isOpen: boolean; toggleChat: () => void }) => {
  return (
    <button
      onClick={toggleChat}
      className={`absolute top-4 right-4 p-2 mb-20 rounded-full transition-transform duration-300 ${
        isOpen ? "transform rotate-315" : ""
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-gray-200 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <MessageSquareMore className={isOpen ? `invisible` : ``} />
    </button>
  );
}

export const ChatToggleButtonText = ({ isOpen, toggleChat }: { isOpen: boolean, toggleChat: () => void }) => {
  return (
    <button
      onClick={toggleChat}
      className={`absolute top-4 right-4 p-2 rounded-full transition-transform duration-300`}
    >
      <span className="text-gray-200">{isOpen ? 'Close Chat' : 'Open Chat'}</span>
    </button>
  );
}

export const Chat = ({ socket, username, scope, gameId }: { socket: any; username: string; scope: "lobby" | "game" | "private"; gameId: string }) => {
  const [message, setMessage] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState<ChatPayload[]>([]);

  React.useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (payload: ChatPayload) => {
      setChatMessages((prev) => [...prev, payload]);
    };

    socket.on("chat_message", handleIncomingMessage);

    return () => {
      socket.off("chat_message", handleIncomingMessage);
    };
  }, [socket]);

  const pmRegex = /^\/pm\s+(\S+)\s+(.+)/i;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === "") return;

    const pmMatch = message.match(pmRegex);
    if (pmMatch) {
      // It's a private message
      const recipient = pmMatch[1];
      const pmText = pmMatch[2];

      const newMessage: PrivateMessage = {
        sender: username,
        scope: "private",
        recipient,
        message: pmText
      };

      //setChatMessages((prev) => [...prev, newMessage]);
      socket.emit("private_message", newMessage);
    } else {
      // Regular chat message
      let newMessage: ChatMessage;
      if (scope === "game") {
        newMessage = {
          sender: username,
          scope: "game",
          gameId: gameId!,
          message
        };
      } else if (scope === "lobby") {
        newMessage = {
          sender: username,
          scope: "lobby",
          message
        };
      } else {
        // fallback for private, though this should not happen here
        newMessage = {
          sender: username,
          scope: "private",
          recipient: "",
          message
        };
      }

      //setChatMessages((prev) => [...prev, newMessage]);
      socket.emit("chat_message", newMessage);
    }
    setMessage("");
  };
  
  return (
    <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Chat</h2>

      <div className="h-64 overflow-y-auto border border-gray-700 rounded p-2 mb-4 bg-gray-700">
        {chatMessages.length === 0 ? (
          <p className="text-gray-400 text-center italic p-4">
            No messages yet
          </p>
        ) : (
          <div className="space-y-2 p-1">
            {chatMessages.map((msg, i) => (
              <div key={i} className="bg-gray-800 p-2 rounded">
                <div className="flex">
                  <div className="text-xs text-gray-500 mt-1">
                    {msg.timestamp.toString()}
                  </div>
                  {msg.privateMsg && (
                    <span className="text-pink-400 font-bold mr-2 text-xs">
                      &nbsp;&gt;&gt;PM&gt;&gt;
                    </span>
                  )}
                </div>
                <span className={`font-medium ${getUsernameColor(msg.sender, username)}`}>
                  {msg.sender}:{" "}
                </span>
                <span className="text-gray-200">{msg.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-600 bg-gray-700 text-gray-200 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-r"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default DraggableChat;