"use client";

import { motion } from "framer-motion";
import { CreateRoomButton } from "@/components/landing/create-room-button";
import { JoinRoomForm } from "@/components/landing/join-room-form";
import { PlaySoloButton } from "@/components/landing/play-solo-button";
import { ThemedBackground } from "@/components/themed-background";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <ThemedBackground />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:py-28">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-balance font-display text-4xl font-extrabold sm:text-5xl md:text-6xl"
        >
          Mini-games with your friends, <span className="text-gradient-party">right in the browser</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl text-balance text-lg text-muted-foreground"
        >
          Share a room code, no download and no account needed. Live rounds, session
          scoreboards, and instant rematches.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-3 sm:flex-row"
        >
          <CreateRoomButton />
          <JoinRoomForm />
          <PlaySoloButton />
        </motion.div>
      </div>
    </section>
  );
}
