/** Datas sempre no formato yyyy-mm-dd, no fuso de quem está usando. */

export function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function hoje() {
  return isoLocal(new Date());
}

export function paraData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function somarDias(iso: string, dias: number) {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}

export function diferencaDias(de: string, ate: string) {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86400000);
}

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function diaDaSemana(iso: string) {
  return paraData(iso).getDay();
}

export function dataPorExtenso(iso: string) {
  const d = paraData(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function dataCurta(iso: string) {
  const d = paraData(iso);
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
}

export function mesCurto(iso: string) {
  return MESES_CURTOS[paraData(iso).getMonth()].toUpperCase();
}

export function quando(isoDataHora: string) {
  const dia = isoLocal(new Date(isoDataHora));
  const dif = diferencaDias(dia, hoje());
  if (dif === 0) return "hoje";
  if (dif === 1) return "ontem";
  if (dif < 7) return DIAS[paraData(dia).getDay()];
  return dataCurta(dia);
}

export function formatarTempo(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Número pseudoaleatório estável a partir de um texto (mesmo dia = mesmo bloco). */
export function semente(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
