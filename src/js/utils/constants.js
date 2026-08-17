// ============================================================
//  CONSTANTES GLOBALES
// ============================================================

export const DIVISIONES_POR_PAIS = {
    'GT': [ { id: 'GT Centro', nombre: 'GT Centro' }, { id: 'GT Norte', nombre: 'GT Norte' }, { id: 'GT Sur', nombre: 'GT Sur' } ],
    'SV': [ { id: 'SV Occidente', nombre: 'SV Occidente' }, { id: 'SV Centro', nombre: 'SV Centro' }, { id: 'SV Oriente', nombre: 'SV Oriente' } ],
    'HN': [ { id: 'HN Centro', nombre: 'HN Centro' }, { id: 'HN Norte', nombre: 'HN Norte' } ]
};

export const PAISES_MAPA_NOMBRES = {
    'GT': 'Guatemala',
    'SV': 'El Salvador',
    'HN': 'Honduras'
};

export const COLORES_DIAS = {
    'Lunes': '#b91c1c',
    'Martes': '#0369a1',
    'Miércoles': '#15803d',
    'Jueves': '#5b21b6',
    'Viernes': '#c2410c',
    'Sábado': '#be185d'
};

export const MAPEO_RUTAS_GRUPOS = {
    '1.1.54': 'GRUPO 02',
    '1.1.51': 'GRUPO 05',
    '1.2.45': 'GRUPO 06',
    '1.2.46': 'GRUPO 06'
};

export const USUARIOS_ROLES_FALLBACK = [
    { nombre: "JORGE LUIS PINEDA", rol: "Supervisor", pais: "El Salvador", division: "SV Centro", grupo: "GRUPO 01", pass: "G01" },
    { nombre: "NOE HERNANDEZ", rol: "Jefatura", pais: "El Salvador", division: "SV Centro", grupo: "TODOS", pass: "BOCADELI" },
    { nombre: "ISRAEL CONSUEGRA", rol: "Administrador", pais: "TODOS", division: "TODOS", grupo: "TODOS", pass: "SVCENTRO" }
];
