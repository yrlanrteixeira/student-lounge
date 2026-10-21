"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadContent, setContent } from "../content";
import { browserClient } from "../supabase/client";
import { Button, Loading } from "@/components/ui";

interface Ctx {
  isAdmin: boolean;
  /** Reloads questions, topics and subjects after an admin changes something. */
  reload(): Promise<void>;
}

const ContentContext = createContext<Ctx | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const isPublic = usePathname().startsWith("/login");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const reload = useCallback(async () => {
    const [content, admin] = await Promise.all([loadContent(), browserClient().rpc("is_admin")]);
    setContent(content);
    setIsAdmin(admin.data === true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (isPublic || ready) return;
    reload().catch((e) => setError(String(e?.message ?? e)));
  }, [isPublic, ready, reload]);

  if (isPublic) return <ContentContext.Provider value={{ isAdmin: false, reload }}>{children}</ContentContext.Provider>;
  if (error)
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base font-semibold">Não foi possível carregar o conteúdo.</p>
        <p className="text-[13px] text-ink-2">{error}</p>
        <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
      </div>
    );
  if (!ready) return <Loading />;
  return <ContentContext.Provider value={{ isAdmin, reload }}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const c = useContext(ContentContext);
  if (!c) throw new Error("useContent outside ContentProvider");
  return c;
}
