import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl flex-1 px-5 py-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">← Home</Link>
        <h1 className="display mt-6 text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-2">Last updated {updated}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
