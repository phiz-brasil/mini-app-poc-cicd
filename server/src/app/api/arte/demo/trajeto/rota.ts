/** Caminho inventado (volta no Ibirapuera) pras prévias públicas. */
export const ROTA_DEMO: [number, number][] = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 119) * Math.PI * 2;
  return [-23.587 + 0.006 * Math.sin(a) + 0.0015 * Math.sin(3 * a), -46.657 + 0.009 * Math.cos(a) + 0.002 * Math.cos(5 * a)];
});
