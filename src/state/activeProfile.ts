import { create } from 'zustand';
import { getSetting, setSetting } from '../db/settings';

type S = {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
  hydrate: () => void;
};

export const useActiveProfile = create<S>((set) => ({
  activeProfileId: null,
  setActiveProfileId: (id) => {
    if (id) setSetting('active_profile_id', id);
    set({ activeProfileId: id });
  },
  hydrate: () => set({ activeProfileId: getSetting('active_profile_id') }),
}));
