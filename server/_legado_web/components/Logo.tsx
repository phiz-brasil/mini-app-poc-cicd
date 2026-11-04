import { iniciais, corDe } from "@/lib/tipos";

/** Marca do Tá Pago!: quadrado com o check. `claro` = branco com check laranja (em cima do laranja). */
export function Logo({ size = 28, raio, claro }: { size?: number; raio?: number; claro?: boolean }) {
  return (
    <span className={"logo" + (claro ? " claro" : "")} style={{ width: size, height: size, borderRadius: raio ?? size * 0.28 }}>
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden>
        <path d="M5 12.5l4.2 4.2L19 7" stroke={claro ? "#FF5A1F" : "#fff"} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Avatar({ nome, id, size = 44 }: { nome: string; id: string; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, background: corDe(id), fontSize: size * 0.36 }}>{iniciais(nome)}</span>
  );
}
