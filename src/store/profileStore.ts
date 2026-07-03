import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '../types'
import { uid } from '../utils/format'

interface ProfileState {
  profile: Profile | null
  hasProfile: () => boolean
  createProfile: (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProfile: (patch: Partial<Profile>) => void
  reset: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      hasProfile: () => get().profile !== null,
      createProfile: (data) => {
        const now = new Date().toISOString()
        set({
          profile: {
            id: uid(),
            createdAt: now,
            updatedAt: now,
            ...data,
          },
        })
      },
      updateProfile: (patch) =>
        set((state) =>
          state.profile
            ? {
                profile: {
                  ...state.profile,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                },
              }
            : state,
        ),
      reset: () => set({ profile: null }),
    }),
    { name: 'rp-profile' },
  ),
)
