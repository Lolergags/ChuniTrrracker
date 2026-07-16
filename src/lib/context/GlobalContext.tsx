import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client.js';

export interface FilterOptions {
  server: string;
  diff: string;
  version: string;
}

const defaultFilters: FilterOptions = {
  server: 'JP',
  diff: 'ALL',
  version: 'ALL'
};

interface GlobalContextType {
  activePlayer: string | null;
  playersList: string[];
  setActivePlayer: (username: string | null) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
}

export const GlobalContext = createContext<GlobalContextType>({
  activePlayer: null,
  playersList: [],
  setActivePlayer: () => {},
  filters: defaultFilters,
  setFilters: () => {}
});

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playersList, setPlayersList] = useState<string[]>([]);
  const [activePlayer, setActivePlayerState] = useState<string | null>(() => {
    return localStorage.getItem('activePlayer');
  });
  const [filters, setFiltersState] = useState<FilterOptions>(() => {
    const saved = localStorage.getItem('globalFilters');
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  const setActivePlayer = (username: string | null) => {
    if (username === null) {
      localStorage.removeItem('activePlayer');
    } else {
      localStorage.setItem('activePlayer', username);
    }
    setActivePlayerState(username);
  };

  const setFilters = (newFilters: FilterOptions) => {
    localStorage.setItem('globalFilters', JSON.stringify(newFilters));
    setFiltersState(newFilters);
  };

  // Fetch initial list of players on mount
  useEffect(() => {
    api.getPlayers().then(players => {
      const usernames = players.map((p: any) => p.username);
      setPlayersList(usernames);
      if (usernames.length > 0) {
        if (localStorage.getItem('activePlayer') && !usernames.includes(localStorage.getItem('activePlayer')!)) {
          // If the stored player was deleted from the database
          localStorage.removeItem('activePlayer');
          setActivePlayerState(null);
        }
      }
    }).catch(err => console.error("Failed to load players list", err));
  }, []);

  return (
    <GlobalContext.Provider value={{ activePlayer, playersList, setActivePlayer, filters, setFilters }}>
      {children}
    </GlobalContext.Provider>
  );
};
