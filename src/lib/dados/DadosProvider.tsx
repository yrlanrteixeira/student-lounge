"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CausaErro, Confianca, Contexto, Perfil, QuestaoIndice, Resposta, Revisao, SimuladoResultado, TopicoStatus } from "../tipos";
import { PERFIL_PADRAO, repoLocal, repoNuvem, type DadosUsuario, type Repo } from "./repo";
import { SUPABASE_ATIVO } from "../supabase/config";
import { hoje, somarDias } from "../datas";

/** Intervalos da repetição espaçada, em dias, por etapa. */
export const INTERVALOS = [1, 3, 7, 15, 30];

interface Ctx extends DadosUsuario {
  carregando: boolean;
  erro: string | null;
  modo: Repo["modo"];
  email: string | null;
  revisaoPorQuestao: Map<string, Revisao>;
  registrarResposta(args: {
    questao: QuestaoIndice;
    alternativa: string;
    gabarito: string;
    confianca: Confianca | null;
    tempoSeg: number;
    contexto: Contexto;
  }): Resposta;
  definirCausa(respostaId: string, causa: CausaErro): void;
  marcarTopico(topicoId: string, campos: Partial<Pick<TopicoStatus, "guia_lido" | "dominado_manual">>): void;
  salvarPerfil(p: Perfil): Promise<void>;
  salvarSimulado(s: Omit<SimuladoResultado, "id" | "created_at">): void;
  sair(): Promise<void>;
}

const Contexto_ = createContext<Ctx | null>(null);

function novoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const repo = SUPABASE_ATIVO ? repoNuvem : repoLocal;
  const [dados, setDados] = useState<DadosUsuario>({ perfil: PERFIL_PADRAO, respostas: [], revisoes: [], topicos: [], simulados: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const dadosRef = useRef(dados);
  dadosRef.current = dados;

  useEffect(() => {
    let vivo = true;
    Promise.all([repo.carregar(), repo.email()])
      .then(([d, e]) => {
        if (!vivo) return;
        setDados(d);
        setEmail(e);
      })
      .catch((e) => vivo && setErro(String(e?.message ?? e)))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [repo]);

  const falha = useCallback((e: unknown) => {
    setErro(`Não foi possível salvar: ${(e as Error)?.message ?? e}. Verifique a internet.`);
  }, []);

  const revisaoPorQuestao = useMemo(() => new Map(dados.revisoes.map((r) => [r.questao_id, r])), [dados.revisoes]);

  const registrarResposta: Ctx["registrarResposta"] = useCallback(
    ({ questao, alternativa, gabarito, confianca, tempoSeg, contexto }) => {
      const correta = alternativa === gabarito;
      const agora = new Date().toISOString();
      const resposta: Resposta = {
        id: novoId(),
        questao_id: questao.id,
        materia_id: questao.materia,
        topico_id: questao.topico,
        pegadinhas: questao.pegadinhas,
        alternativa,
        correta,
        confianca,
        causa_erro: null,
        tempo_seg: Math.round(tempoSeg),
        contexto,
        created_at: agora,
      };

      // Repetição espaçada: erro volta amanhã; acerto avança; acerto "na dúvida" entra para revisão.
      const atual = dadosRef.current.revisoes.find((r) => r.questao_id === questao.id);
      let revisao: Revisao | null = null;
      if (!correta) {
        revisao = { questao_id: questao.id, etapa: 0, proxima: somarDias(hoje(), INTERVALOS[0]), updated_at: agora };
      } else if (atual && atual.proxima) {
        const etapa = atual.etapa + 1;
        revisao = {
          questao_id: questao.id,
          etapa,
          proxima: etapa >= INTERVALOS.length ? null : somarDias(hoje(), INTERVALOS[etapa]),
          updated_at: agora,
        };
      } else if (!atual && confianca === "duvida") {
        revisao = { questao_id: questao.id, etapa: 1, proxima: somarDias(hoje(), INTERVALOS[1]), updated_at: agora };
      }

      setDados((d) => ({
        ...d,
        respostas: [...d.respostas, resposta],
        revisoes: revisao ? d.revisoes.filter((r) => r.questao_id !== questao.id).concat(revisao) : d.revisoes,
      }));
      repo.inserirResposta(resposta).catch(falha);
      if (revisao) repo.salvarRevisao(revisao).catch(falha);
      return resposta;
    },
    [repo, falha]
  );

  const definirCausa = useCallback(
    (respostaId: string, causa: CausaErro) => {
      setDados((d) => ({ ...d, respostas: d.respostas.map((r) => (r.id === respostaId ? { ...r, causa_erro: causa } : r)) }));
      repo.atualizarCausa(respostaId, causa).catch(falha);
    },
    [repo, falha]
  );

  const marcarTopico: Ctx["marcarTopico"] = useCallback(
    (topicoId, campos) => {
      const atual = dadosRef.current.topicos.find((t) => t.topico_id === topicoId);
      const novo: TopicoStatus = {
        topico_id: topicoId,
        guia_lido: atual?.guia_lido ?? false,
        dominado_manual: atual?.dominado_manual ?? false,
        ...campos,
        updated_at: new Date().toISOString(),
      };
      setDados((d) => ({ ...d, topicos: d.topicos.filter((t) => t.topico_id !== topicoId).concat(novo) }));
      repo.salvarTopico(novo).catch(falha);
    },
    [repo, falha]
  );

  const salvarPerfil = useCallback(
    async (p: Perfil) => {
      setDados((d) => ({ ...d, perfil: p }));
      await repo.salvarPerfil(p).catch(falha);
    },
    [repo, falha]
  );

  const salvarSimulado: Ctx["salvarSimulado"] = useCallback(
    (s) => {
      const novo: SimuladoResultado = { ...s, id: novoId(), created_at: new Date().toISOString() };
      setDados((d) => ({ ...d, simulados: [...d.simulados, novo] }));
      repo.inserirSimulado(novo).catch(falha);
    },
    [repo, falha]
  );

  const sair = useCallback(async () => {
    await repo.sair();
    window.location.href = "/login";
  }, [repo]);

  const valor: Ctx = {
    ...dados,
    carregando,
    erro,
    modo: repo.modo,
    email,
    revisaoPorQuestao,
    registrarResposta,
    definirCausa,
    marcarTopico,
    salvarPerfil,
    salvarSimulado,
    sair,
  };

  return <Contexto_.Provider value={valor}>{children}</Contexto_.Provider>;
}

export function useDados() {
  const c = useContext(Contexto_);
  if (!c) throw new Error("useDados fora do DadosProvider");
  return c;
}
