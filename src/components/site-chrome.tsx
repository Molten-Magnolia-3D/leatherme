import Link from "next/link";
import type { ReactNode } from "react";
import { APP_VERSION } from "@/lib/releases";
import { cn } from "@/lib/utils";

export function SiteChrome({
  children,
  trailing,
  current = "workbench",
}: {
  children?: ReactNode;
  trailing?: ReactNode;
  current?: "workbench" | "releases";
}) {
  return (
    <header className="border-b border-border bg-[linear-gradient(180deg,#3b2416,#2a1a12)] text-[#f4efe6]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-end gap-6">
          <Link href="/" className="no-underline">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#d7b48a]">Leathercraft stencil maker</p>
            <p className="font-display text-3xl leading-none text-[#f4efe6] sm:text-4xl">Leatherme</p>
          </Link>
          <nav className="flex items-center gap-3 pb-1 text-sm">
            <NavLink href="/" active={current === "workbench"}>
              Workbench
            </NavLink>
            <NavLink href="/releases" active={current === "releases"}>
              Releases
            </NavLink>
            <span className="rounded-full border border-[#d7b48a]/30 px-2 py-0.5 text-[11px] tracking-wide text-[#d7b48a]">
              v{APP_VERSION}
            </span>
          </nav>
        </div>
        {trailing ? <div className="flex flex-wrap items-center gap-2">{trailing}</div> : null}
      </div>
      {children}
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2 py-1 text-[#f4efe6] no-underline",
        active ? "bg-[#4a2f20]" : "hover:bg-[#4a2f20]/70",
      )}
    >
      {children}
    </Link>
  );
}
