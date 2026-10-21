/** Lei seca oficial de cada matéria (links do Planalto, ALESP e do próprio edital). */
export const LEI_SECA: Record<string, { nome: string; url: string; trecho?: string }[]> = {
  penal: [{ nome: "Código Penal", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", trecho: "arts. 293–305; 307; 308; 311-A; 312–317; 319–333; 336–337; 339–347; 357; 359" }],
  processo_penal: [
    { nome: "Código de Processo Penal", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", trecho: "arts. 251–258; 261–267; 274; 351–372; 394–497; 531–538; 541–548; 574–667" },
    { nome: "Lei 9.099/95 (JECRIM)", url: "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm", trecho: "arts. 60–83; 88; 89" },
  ],
  processo_civil: [
    { nome: "Código de Processo Civil", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm", trecho: "arts. 144–155; 188–275; 294–311; 318–538; 994–1026" },
    { nome: "Lei 9.099/95 (JEC)", url: "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm", trecho: "arts. 3º–19" },
    { nome: "Lei 12.153/09 (JEFAZ)", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12153.htm", trecho: "na íntegra" },
  ],
  constitucional: [{ nome: "Constituição Federal", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", trecho: "arts. 5º–13; 37–41; 92" }],
  administrativo: [
    { nome: "Lei 10.261/68 (Estatuto SP)", url: "https://www.al.sp.gov.br/repositorio/legislacao/lei/1968/lei-10261-28.10.1968.html", trecho: "arts. 1º–86; 171–175; 239–323" },
    { nome: "Lei 8.429/92 (Improbidade)", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm", trecho: "na íntegra" },
  ],
  legislacao_interna: [
    { nome: "Resolução TJSP 850/2021 (Teletrabalho)", url: "https://esaj.tjsp.jus.br/gcn-frontend-vue/legislacao/find/196070" },
    { nome: "Resolução TJSP 963/2025 (eproc)", url: "https://esaj.tjsp.jus.br/gcn-frontend-vue/legislacao/find/229313" },
    { nome: "LC 1.111/2010 (Plano de Cargos)", url: "https://www.al.sp.gov.br/repositorio/legislacao/lei.complementar/2010/lei.complementar-1111-25.05.2010.html" },
    { nome: "Regimento Interno do TJSP", url: "https://www.tjsp.jus.br/Download/Portal/Biblioteca/Biblioteca/Legislacao/RegimentoInternoTJSP.pdf" },
    { nome: "Normas da Corregedoria (Tomo I)", url: "https://www.tjsp.jus.br/Corregedoria/Comunicados/NormasJudiciais", trecho: "Cap. II Seção I (subs. I e II); Cap. III Seções I, II, V–VII, VIII (subs. I–III), IX–XIX; Cap. XI Seções I–VII" },
  ],
  atualidades_pcd: [{ nome: "Lei 13.146/15 (Estatuto da PcD)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm", trecho: "arts. 1º–13; 34–38" }],
};
