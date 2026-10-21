"use client";

import { useMemo } from "react";
import { useDados } from "./dados/DadosProvider";
import { montarMissao } from "./plano";
import { hoje } from "./datas";

export function useMissao() {
  const { perfil, respostas, revisoes, topicos } = useDados();
  const dia = hoje();
  return useMemo(() => montarMissao({ perfil, respostas, revisoes, topicos, dia }), [perfil, respostas, revisoes, topicos, dia]);
}
