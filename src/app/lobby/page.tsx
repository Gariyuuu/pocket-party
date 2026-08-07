import { SiteNav } from "@/components/landing/site-nav";
import { PublicRoomsList } from "@/components/lobby/public-rooms-list";
import { ThemedBackground } from "@/components/themed-background";

export default function PublicLobbyPage() {
  return (
    <>
      <SiteNav />
      <main className="relative flex-1 overflow-hidden">
        <ThemedBackground className="absolute inset-0 -z-10" />
        <div className="relative mx-auto w-full max-w-2xl px-4 py-10">
          <h1 className="mb-6 font-display text-2xl font-bold">Public rooms</h1>
          <PublicRoomsList />
        </div>
      </main>
    </>
  );
}
