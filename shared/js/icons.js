// IGB AEC Suite — line icons, one per tool. Same stroke for all: gold, 1.5px, round caps.

const svg = (body, label) => `<svg viewBox="0 0 24 24" fill="none" stroke="#e6c169" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">${body}</svg>`;

export const TOOL_ICONS = {
  // 01 Presupuestador — sheet with $ and bar chart
  '01': svg('<path d="M6 2.75h8.25L18.5 7v14.25H6z"/><path d="M14 2.75V7h4.5"/><path d="M11.9 5.6c-.5-.4-1.1-.55-1.6-.5-.8.05-1.3.5-1.3 1.05 0 1.3 2.95.75 2.95 2.1 0 .6-.6 1.05-1.45 1.05-.6 0-1.2-.2-1.65-.6M10.1 4.2v6"/><path d="M9 18.25v-3M12.25 18.25v-5.5M15.5 18.25v-4"/>', 'Presupuestador'),
  // 02 Visualizador — floor plan → house
  '02': svg('<rect x="2.25" y="6" width="8" height="11"/><path d="M2.25 11.5h4.5V17M6.75 6v2.5"/><path d="M11.75 11.5h3.25m-1.4-1.6L15.2 11.5l-1.6 1.6"/><path d="M16.5 13 19.25 10.25 22 13v5h-5.5z"/><path d="M18.6 18v-2.3h1.3V18"/>', 'Visualizador'),
  // 03 Propuestas — document with signature line
  '03': svg('<path d="M6 2.75h8.25L18.5 7v14.25H6z"/><path d="M14 2.75V7h4.5"/><path d="M8.75 9.25h6.5M8.75 12h6.5"/><path d="M8.75 17.1c.7-1.3 1.5-1.7 1.9-.9.35.7.8 1 1.4.3.55-.6 1.05-.7 1.45-.15"/><path d="M8.75 18.9h6.5"/>', 'Propuestas'),
  // 04 Contenido — stacked posts / feed
  '04': svg('<rect x="7.25" y="2.75" width="14" height="13.5" rx="1.5"/><path d="M4.25 6.5v12.25a1.5 1.5 0 0 0 1.5 1.5H17"/><path d="M7.25 12.75l3.75-3.5 3 2.75 2.25-1.75 5 4"/><circle cx="16.75" cy="6.75" r="1.1"/>', 'Contenido'),
  // 05 Factibilidad — lot boundary with hatched building footprint
  '05': svg('<rect x="2.75" y="2.75" width="18.5" height="18.5" rx="1" stroke-dasharray="2.5 2"/><rect x="6.25" y="8.75" width="11.5" height="9"/><path d="M6.25 12.75l4-4M6.25 17.25l8.5-8.5M10.75 17.75l7-7M15.25 17.75l2.5-2.5"/>', 'Factibilidad'),
  // 06 Herramienta del participante — hueco: recuadro punteado con «+»
  '06': svg('<rect x="2.75" y="2.75" width="18.5" height="18.5" rx="1.5" stroke-dasharray="2.5 2"/><path d="M12 8v8M8 12h8"/>', 'Herramienta 06'),
};

export const iconTile = (num, cls = '') => `<span class="icon-tile ${cls}" aria-hidden="true">${TOOL_ICONS[num] ?? ''}</span>`;
