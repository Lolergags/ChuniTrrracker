import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client.js';

interface GlobalContextType {
  activePlayer: string | null;
  playersList: string[];
  setActivePlayer: (username: string) => void;
}

export const GlobalContext = createContext<GlobalContextType>({
  activePlayer: null,
  playersList: [],
  setActivePlayer: () => {},
});

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playersList, setPlayersList] = useState<string[]>([]);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);

  // Fetch initial list of players on mount
  useEffect(() => {
    api.getPlayers().then(players => {
      const usernames = players.map((p: any) => p.username);
      setPlayersList(usernames);
      if (usernames.length > 0) {
        setActivePlayer(usernames[0]);
      }
    }).catch(err => console.error("Failed to load players list", err));
  }, []);

  return (
    <GlobalContext.Provider value={{ activePlayer, playersList, setActivePlayer }}>
      {children}
    </GlobalContext.Provider>
  );
};
