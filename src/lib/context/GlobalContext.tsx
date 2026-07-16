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
  refreshPlayers: () => Promise<void>;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
}

export const GlobalContext = createContext<GlobalContextType>({
  activePlayer: null,
  playersList: [],
  setActivePlayer: () => {},
  filters: defaultFilters,
  setFilters: () => {},
  refreshPlayers: async () => {},
  isAdmin: false,
  setIsAdmin: () => {}
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
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!localStorage.getItem('adminKey'));

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

  const refreshPlayers = async () => {
    try {
      const players = await api.getPlayers();
      const usernames = players.map((p: any) => p.username);
      setPlayersList(usernames);
      if (usernames.length > 0) {
        if (localStorage.getItem('activePlayer') && !usernames.includes(localStorage.getItem('activePlayer')!)) {
          localStorage.removeItem('activePlayer');
          setActivePlayerState(null);
        }
      } else {
        localStorage.removeItem('activePlayer');
        setActivePlayerState(null);
      }
    } catch (err) {
      console.error("Failed to load players list", err);
    }
  };

  // Fetch initial list of players on mount
  useEffect(() => {
    refreshPlayers();
  }, []);

  return (
    <GlobalContext.Provider value={{ activePlayer, playersList, setActivePlayer, filters, setFilters, refreshPlayers, isAdmin, setIsAdmin }}>
      {children}
    </GlobalContext.Provider>
  );
};
