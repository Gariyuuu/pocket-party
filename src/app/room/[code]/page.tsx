import { RoomPageClient } from "@/components/room/room-page-client";
import { normalizeRoomCode } from "@/lib/multiplayer/room-code";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomPageClient code={normalizeRoomCode(code)} />;
}
