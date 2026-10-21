// Poucos ícones, só onde ajudam: barra do celular, botões só com ícone e o logo.
type P = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconeHoje = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);
export const IconeQuestoes = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 11l3 3 8-8" />
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
  </svg>
);
export const IconeRevisao = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
export const IconeDiagnostico = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconeEdital = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 4h11l5 5v11H4z" />
    <path d="M14 4v6h6" />
  </svg>
);
export const IconeFechar = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
export const IconeVoltar = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const Logo = () => (
  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-botao bg-rosa-700 text-white">
    <svg {...base} width={16} height={16} strokeWidth={2.2}>
      <path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
    </svg>
  </span>
);
