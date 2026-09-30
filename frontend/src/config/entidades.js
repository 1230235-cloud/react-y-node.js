/**
 * Descripcion declarativa de los catalogos. Es la fuente de verdad para
 * CrudPage: de aqui salen el formulario, las columnas de la tabla, los
 * filtros y los permisos de escritura. El backend sigue siendo quien
 * valida con zod; esto solo controla como se pinta.
 *
 * Tipos de campo: texto | email | password | numero | select | area
 *
 * `columnas[].orden` es la clave que el backend acepta en ?sortBy=. Debe
 * coincidir con su lista blanca (crud.service.js) o la columna se caeria
 * al orden por defecto sin avisar. Las columnas sin `orden` no son
 * ordenables, porque ese campo no existe en la lista blanca del servidor.
 */

const ETIQUETA_ROL = { admin: 'Administrador', maestro: 'Maestro', alumno: 'Alumno' };

const badgeRol = (valor) =>
  valor === 'admin' ? 'danger' : valor === 'maestro' ? 'primary' : 'secondary';

const ACTIVO = (valor) => ({
  texto: valor ? 'Activo' : 'Inactivo',
  badge: valor ? 'success' : 'secondary',
});

export const ENTIDADES = {
  // ------------------------------------------------------------------
  usuarios: {
    titulo: 'Usuarios',
    singular: 'usuario',
    icono: 'bi-people-fill',
    rolesLectura: ['admin'],
    rolesEscritura: ['admin'],
    ordenDefecto: 'u.nombre',
    columnas: [
      { clave: 'id', etiqueta: 'ID', clase: 'text-body-secondary', ancho: '70px', orden: 'u.id' },
      { clave: 'nombre', etiqueta: 'Nombre', orden: 'u.nombre' },
      { clave: 'email', etiqueta: 'Email', orden: 'u.email' },
      {
        clave: 'rol',
        etiqueta: 'Rol',
        orden: 'u.rol',
        formato: (valor) => ({ texto: ETIQUETA_ROL[valor] ?? valor, badge: badgeRol(valor) }),
      },
      { clave: 'activo', etiqueta: 'Estado', orden: 'u.activo', formato: ACTIVO },
      { clave: 'creado_en', etiqueta: 'Alta', tipo: 'fecha', orden: 'u.creado_en' },
    ],
    campos: [
      { name: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true, max: 80, autoFocus: true },
      { name: 'email', label: 'Email', tipo: 'email', requerido: true, max: 120 },
      {
        name: 'password',
        label: 'Contrasena',
        tipo: 'password',
        requerido: true,
        soloCrear: true,
        max: 72,
        ayuda: 'Minimo 8 caracteres, con al menos una letra y un numero.',
      },
      {
        name: 'rol',
        label: 'Rol',
        tipo: 'select',
        requerido: true,
        defaultValor: 'alumno',
        opciones: [
          { valor: 'alumno', etiqueta: 'Alumno' },
          { valor: 'maestro', etiqueta: 'Maestro' },
          { valor: 'admin', etiqueta: 'Administrador' },
        ],
        ayuda: 'El sistema solo admite 2 administradores.',
      },
      {
        name: 'activo',
        label: 'Activo',
        tipo: 'select',
        requerido: true,
        defaultValor: 1,
        opciones: [
          { valor: 1, etiqueta: 'Si' },
          { valor: 0, etiqueta: 'No' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  materias: {
    titulo: 'Materias',
    singular: 'materia',
    icono: 'bi-journal-text',
    rolesLectura: ['admin', 'maestro'],
    rolesEscritura: ['admin'],
    ordenDefecto: 'mt.nombre',
    columnas: [
      { clave: 'id', etiqueta: 'ID', clase: 'text-body-secondary', ancho: '70px', orden: 'mt.id' },
      { clave: 'nombre', etiqueta: 'Nombre', orden: 'mt.nombre' },
      { clave: 'codigo', etiqueta: 'Codigo', orden: 'mt.codigo' },
      { clave: 'creado_en', etiqueta: 'Alta', tipo: 'fecha', orden: 'mt.creado_en' },
    ],
    campos: [
      { name: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true, max: 100, autoFocus: true },
      { name: 'codigo', label: 'Codigo', tipo: 'texto', requerido: true, max: 20, placeholder: 'MAT-101' },
    ],
  },

  // ------------------------------------------------------------------
  maestros: {
    titulo: 'Maestros',
    singular: 'maestro',
    icono: 'bi-person-video3',
    rolesLectura: ['admin', 'maestro'],
    rolesEscritura: ['admin'],
    ordenDefecto: 'u.nombre',
    columnas: [
      { clave: 'id', etiqueta: 'ID', clase: 'text-body-secondary', ancho: '70px', orden: 'm.id' },
      { clave: 'nombre', etiqueta: 'Nombre', orden: 'u.nombre' },
      { clave: 'email', etiqueta: 'Email' },
      { clave: 'numero_empleado', etiqueta: 'No. empleado', orden: 'm.numero_empleado' },
      { clave: 'especialidad', etiqueta: 'Especialidad', vacio: '—', orden: 'm.especialidad' },
      { clave: 'activo', etiqueta: 'Estado', formato: ACTIVO },
    ],
    campos: [
      {
        name: 'usuario_id',
        label: 'Usuario',
        tipo: 'select',
        requerido: true,
        fuente: {
          endpoint: 'usuarios',
          etiqueta: (fila) => `${fila.nombre} · ${fila.email}`,
          filtro: { rol: 'maestro' },
        },
        ayuda: 'Crea antes el usuario en el catalogo Usuarios con rol Maestro.',
      },
      { name: 'numero_empleado', label: 'Numero de empleado', tipo: 'texto', requerido: true, max: 20 },
      { name: 'especialidad', label: 'Especialidad', tipo: 'texto', max: 100 },
    ],
  },

  // ------------------------------------------------------------------
  grupos: {
    titulo: 'Grupos',
    singular: 'grupo',
    icono: 'bi-diagram-3',
    rolesLectura: ['admin', 'maestro'],
    rolesEscritura: ['admin', 'maestro'],
    ordenDefecto: 'mt.nombre',
    columnas: [
      { clave: 'id', etiqueta: 'ID', clase: 'text-body-secondary', ancho: '70px', orden: 'g.id' },
      { clave: 'materia', etiqueta: 'Materia', orden: 'mt.nombre' },
      {
        clave: 'grado',
        etiqueta: 'Grupo',
        orden: 'g.grado',
        formato: (valor, fila) => `${valor ?? '—'}${fila.seccion ?? ''}`,
      },
      { clave: 'turno', etiqueta: 'Turno', orden: 'g.turno' },
      { clave: 'maestro', etiqueta: 'Maestro', vacio: 'Sin asignar' },
      { clave: 'cupo', etiqueta: 'Cupo' },
    ],
    campos: [
      {
        name: 'materia_id',
        label: 'Materia',
        tipo: 'select',
        requerido: true,
        fuente: {
          endpoint: 'materias',
          etiqueta: (fila) => `${fila.nombre} (${fila.codigo})`,
        },
      },
      {
        name: 'maestro_id',
        label: 'Maestro',
        tipo: 'select',
        requerido: false,
        permiteVacio: true,
        fuente: { endpoint: 'maestros', etiqueta: (fila) => fila.nombre },
      },
      { name: 'grado', label: 'Grado', tipo: 'numero', requerido: true, min: 1, max: 6, defaultValor: 1 },
      { name: 'seccion', label: 'Seccion', tipo: 'texto', requerido: true, max: 1, mayusculas: true },
      {
        name: 'turno',
        label: 'Turno',
        tipo: 'select',
        requerido: true,
        defaultValor: 'matutino',
        opciones: [
          { valor: 'matutino', etiqueta: 'Matutino' },
          { valor: 'vespertino', etiqueta: 'Vespertino' },
        ],
      },
      { name: 'cupo', label: 'Cupo', tipo: 'numero', requerido: true, min: 1, max: 60, defaultValor: 30 },
    ],
  },

  // ------------------------------------------------------------------
  alumnos: {
    titulo: 'Alumnos',
    singular: 'alumno',
    icono: 'bi-mortarboard-fill',
    rolesLectura: ['admin', 'maestro'],
    rolesEscritura: ['admin', 'maestro'],
    ordenDefecto: 'u.nombre',
    columnas: [
      { clave: 'id', etiqueta: 'ID', clase: 'text-body-secondary', ancho: '70px', orden: 'a.id' },
      { clave: 'nombre', etiqueta: 'Nombre', orden: 'u.nombre' },
      { clave: 'matricula', etiqueta: 'Matricula', orden: 'a.matricula' },
      { clave: 'email', etiqueta: 'Email' },
      {
        clave: 'grupo_id',
        etiqueta: 'Grupo',
        vacio: 'Sin grupo',
        formato: (valor, fila) =>
          fila.grupo_id
            ? `${fila.materia ?? ''} · ${fila.grado ?? ''}${fila.seccion ?? ''}`
            : 'Sin grupo',
      },
    ],
    campos: [
      {
        name: 'usuario_id',
        label: 'Usuario',
        tipo: 'select',
        requerido: true,
        fuente: {
          endpoint: 'usuarios',
          etiqueta: (fila) => `${fila.nombre} · ${fila.email}`,
          filtro: { rol: 'alumno' },
        },
        ayuda: 'Crea antes el usuario en el catalogo Usuarios con rol Alumno.',
      },
      { name: 'matricula', label: 'Matricula', tipo: 'texto', requerido: true, max: 20, autoFocus: true },
      {
        name: 'grupo_id',
        label: 'Grupo',
        tipo: 'select',
        requerido: false,
        permiteVacio: true,
        fuente: {
          endpoint: 'grupos',
          etiqueta: (fila) => `${fila.materia} · ${fila.grado ?? ''}${fila.seccion ?? ''}`,
        },
      },
    ],
  },
};

export const NOMBRES_ENTIDADES = Object.keys(ENTIDADES);

export function obtenerEntidad(nombre) {
  const entidad = ENTIDADES[nombre];
  if (!entidad) throw new Error(`Catalogo desconocido: ${nombre}`);
  return entidad;
}

/** Catalogos que puede ver un usuario con el rol indicado. */
export function entidadesVisibles(rol) {
  return NOMBRES_ENTIDADES.filter((nombre) => ENTIDADES[nombre].rolesLectura.includes(rol));
}