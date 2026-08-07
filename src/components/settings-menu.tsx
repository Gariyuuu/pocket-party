"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAudioSettings } from "@/lib/audio/use-audio-settings";
import { useAccessibilitySettings } from "@/lib/design/use-accessibility-settings";
import { ThemePackPicker } from "@/components/theme-pack-picker";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const { soundEnabled, musicEnabled, vibrationEnabled, toggleSound, toggleMusic, toggleVibration } =
    useAudioSettings();
  const { highContrastEnabled, toggleHighContrast } = useAccessibilitySettings();

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setOpen(true)}>
        <Settings className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Settings</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Theme</Label>
              <ThemePackPicker />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-toggle">Sound effects</Label>
              <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={toggleSound} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="music-toggle">Music</Label>
              <Switch id="music-toggle" checked={musicEnabled} onCheckedChange={toggleMusic} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="vibration-toggle">Vibration</Label>
              <Switch id="vibration-toggle" checked={vibrationEnabled} onCheckedChange={toggleVibration} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="contrast-toggle">High contrast</Label>
              <Switch id="contrast-toggle" checked={highContrastEnabled} onCheckedChange={toggleHighContrast} />
            </div>
            <p className="text-xs text-muted-foreground">
              Reduced motion follows your system accessibility setting automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
