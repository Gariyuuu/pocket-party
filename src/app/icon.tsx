import { ImageResponse } from "next/og";
import { IconMark } from "./icon-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconMark size={32} />, size);
}
