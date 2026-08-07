"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AVATAR_COLOR_OPTIONS, type AvatarColorId } from "@/lib/design/tokens";

function randomAvatarColor(): AvatarColorId {
  const options = AVATAR_COLOR_OPTIONS;
  return options[Math.floor(Math.random() * options.length)].id;
}

function randomGuestName(): string {
  const adjectives = ["Quick", "Lucky", "Silent", "Brave", "Clever", "Sunny", "Rowdy", "Chill"];
  const nouns = ["Fox", "Otter", "Falcon", "Panda", "Comet", "Maple", "Rhino", "Pixel"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}${Math.floor(Math.random() * 90 + 10)}`;
}

interface GuestIdentityState {
  nickname: string;
  avatarColor: AvatarColorId;
  hasCustomizedNickname: boolean;
  setNickname: (nickname: string) => void;
  setAvatarColor: (color: AvatarColorId) => void;
}

export const useGuestIdentity = create<GuestIdentityState>()(
  persist(
    (set) => ({
      nickname: randomGuestName(),
      avatarColor: randomAvatarColor(),
      hasCustomizedNickname: false,
      setNickname: (nickname) => set({ nickname, hasCustomizedNickname: true }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
    }),
    { name: "pocket-party-identity" },
  ),
);
