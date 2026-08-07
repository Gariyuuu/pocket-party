import { SiteNav } from "@/components/landing/site-nav";
import { Badge } from "@/components/ui/badge";
import { PATCH_NOTES } from "@/lib/content/patch-notes";

export const metadata = {
  title: "Patch Notes — Pocket Party",
};

export default function PatchNotesPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold">Patch notes</h1>
        <ol className="flex flex-col gap-6">
          {PATCH_NOTES.map((note) => (
            <li key={note.version} className="rounded-2xl border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">v{note.version}</Badge>
                <h2 className="font-display font-bold">{note.title}</h2>
                <span className="text-xs text-muted-foreground">{note.date}</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {note.highlights.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
