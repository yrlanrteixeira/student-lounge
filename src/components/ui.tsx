import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Cartao({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-cartao border border-borda bg-cartao", className)} {...rest}>
      {children}
    </div>
  );
}

export function Titulo({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cx("text-lg font-semibold", className)}>
      {children}
    </h2>
  );
}

type Tom = "rosa" | "acerto" | "erro" | "pegadinha" | "lilas" | "mel" | "menta" | "neutro" | "rosa-forte";
const TONS: Record<Tom, string> = {
  rosa: "bg-rosa-50 text-rosa-700",
  "rosa-forte": "bg-rosa-700 text-white",
  acerto: "bg-acerto-fundo text-acerto-700",
  erro: "bg-erro-fundo text-erro",
  pegadinha: "bg-pegadinha-fundo text-pegadinha",
  lilas: "bg-lilas-fundo text-lilas",
  mel: "bg-mel-fundo text-mel",
  menta: "bg-menta-fundo text-menta",
  neutro: "bg-suave text-texto-2",
};

export function Tag({ tom = "neutro", children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-tag px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", TONS[tom], className)}>{children}</span>;
}

export function Pilula({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", TONS[tom])}>{children}</span>;
}

export function Barra({ valor, cor = "bg-rosa-700", corte, rotulo }: { valor: number; cor?: string; corte?: number; rotulo?: string }) {
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="relative h-1.5 rounded-full bg-borda" role="img" aria-label={rotulo ?? `${Math.round(v * 100)}%`}>
      <div className={cx("h-1.5 rounded-full transition-[width]", cor)} style={{ width: `${v * 100}%` }} />
      {corte !== undefined && <div className="absolute -top-[3px] h-3 w-0.5 bg-texto" style={{ left: `${corte * 100}%` }} />}
    </div>
  );
}

type Variante = "primario" | "secundario" | "suave" | "texto";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-rosa-700 text-white hover:bg-rosa-800 disabled:bg-borda disabled:text-desativado",
  secundario: "border border-borda-forte bg-cartao text-texto-forte hover:bg-lateral disabled:text-desativado",
  suave: "bg-rosa-50 text-rosa-700 hover:bg-rosa-100",
  texto: "text-rosa-700 hover:text-rosa-800 hover:underline px-1",
};
const TAMANHOS = { p: "min-h-8 px-3 text-xs", m: "min-h-10 px-4 text-[13px]", g: "min-h-12 px-5 text-[15px]" };

export function botaoClasses(v: Variante = "primario", t: keyof typeof TAMANHOS = "m", extra?: string) {
  return cx("inline-flex items-center justify-center gap-2 rounded-botao font-semibold transition-colors disabled:cursor-not-allowed", VARIANTES[v], TAMANHOS[t], extra);
}

export function Botao({ variante = "primario", tamanho = "m", className, ...rest }: ComponentProps<"button"> & { variante?: Variante; tamanho?: keyof typeof TAMANHOS }) {
  return <button type="button" className={botaoClasses(variante, tamanho, className)} {...rest} />;
}

export function BotaoLink({ variante = "primario", tamanho = "m", className, ...rest }: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: keyof typeof TAMANHOS }) {
  return <Link className={botaoClasses(variante, tamanho, className)} {...rest} />;
}

export function Aviso({ tom = "pegadinha", children }: { tom?: "pegadinha" | "erro" | "rosa" | "acerto"; children: ReactNode }) {
  const t = {
    pegadinha: "bg-pegadinha-fundo border-pegadinha-borda text-[#7A2E0E]",
    erro: "bg-erro-fundo border-erro-borda text-[#7A271A]",
    rosa: "bg-rosa-50 border-rosa-100 text-rosa-900",
    acerto: "bg-acerto-fundo border-acerto-borda text-[#074D31]",
  }[tom];
  return (
    <div role="note" className={cx("rounded-[10px] border px-4 py-3 text-[13px] leading-relaxed", t)}>
      {children}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-cartao border border-dashed border-borda p-6 text-center">
      <span className="text-sm font-semibold">{titulo}</span>
      {children && <span className="text-xs text-texto-3">{children}</span>}
    </div>
  );
}

export function Carregando() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-texto-3" role="status">
      Carregando…
    </div>
  );
}

export function pct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
}

/** Renderiza markdown simples (tabelas, negrito, listas) vindo do guia. */
export function MarkdownSimples({ texto }: { texto: string }) {
  if (!texto) return null;
  const linhas = texto.trim().split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((parte, k) =>
      parte.startsWith("**") && parte.endsWith("**") ? <strong key={k}>{parte.slice(2, -2)}</strong> : <span key={k}>{parte}</span>
    );
  while (i < linhas.length) {
    const l = linhas[i];
    if (l.trim().startsWith("|")) {
      const tabela: string[][] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) {
        const cels = linhas[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cels.every((c) => /^:?-{2,}:?$/.test(c))) tabela.push(cels);
        i++;
      }
      const [cab, ...corpo] = tabela;
      blocos.push(
        <div key={i} className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr>{cab?.map((c, k) => <th key={k} scope="col" className="border-b border-borda px-2 py-2 text-left font-semibold">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {corpo.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-suave px-2 py-2 align-top">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\s*[-*] /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*] /, ""));
      blocos.push(
        <ul key={i} className="list-disc space-y-1 pl-5">
          {itens.map((t, k) => <li key={k}>{inline(t)}</li>)}
        </ul>
      );
      continue;
    }
    if (l.trim()) blocos.push(<p key={i}>{inline(l)}</p>);
    i++;
  }
  return <div className="space-y-2 text-[13px] leading-relaxed">{blocos}</div>;
}
