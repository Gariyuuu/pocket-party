import { Users, MousePointerClick, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: Users,
    title: "Create or join a room",
    description: "Get a six-character code or invite link. No account, no app install.",
  },
  {
    icon: MousePointerClick,
    title: "Pick a game and play",
    description: "Everyone in the room votes ready, then you're straight into the action.",
  },
  {
    icon: Trophy,
    title: "Rematch and keep score",
    description: "See who's winning the session, react with quick emojis, and run it back.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">How Pocket Party works</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-party text-white">
              <step.icon className="size-6" />
            </div>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Step {i + 1}
            </p>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
