import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ENTIDADES, obtenerEntidad } from '../config/entidades.js';

const LIMITE_POR_PAGINA = 10;

// Tope por pagina de listQuerySchema (backend/src/config/catalogs.js).
// Pedir mas da 422: "Too big: expected number to be <=100".
const LIMITE_MAXIMO = 100;
// Tope de paginas al rellenar un desplegable. Evita un bucle interminable si
// el catalogo creciera mucho; a partir de 1000 filas el selector se avisa.
const MAX_PAGINAS_OPCIONES = 10;

// Cache de las opciones de los selectores FK: pedir /grupos una vez por
// cada alumno de la tabla seria absurdo, asi que se cachea por endpoint.
const cacheOpciones = new Map();

async function cargarOpciones(endpoint, filtro) {
  const clave = `${endpoint}:${JSON.stringify(filtro ?? {})}`;
  if (cacheOpciones.has(clave)) return cacheOpciones.get(clave);

  const promesa = (async () => {
    const filas = [];
    let pagina = 1;
    let totalPaginas = 1;

    // El backend pagina de 100 en 100, asi que se recorren las paginas
    // necesarias en vez de truncar el desplegable al primer lote.
    while (pagina <= totalPaginas && pagina <= MAX_PAGINAS_OPCIONES) {
      const respuesta = await api.listar(endpoint, {
        ...filtro,
        limit: LIMITE_MAXIMO,
        page: pagina,
        // Cada catalogo declara un orden que el backend acepta; sin esto
        // la lista sale en orden de id.
        sortBy: ENTIDADES[endpoint]?.ordenDefecto ?? undefined,
        order: 'asc',
      });

      filas.push(...respuesta.data);
      totalPaginas = respuesta.pagination.totalPages;
      pagina += 1;
    }

    return filas;
  })().catch(() => []);

  cacheOpciones.set(clave, promesa);
  return promesa;
}

/** Se llama tras crear o borrar para que los selectores no queden obsoletos. */
function invalidarOpciones() {
  cacheOpciones.clear();
}

function Modal({ titulo, subtitulo, onCerrar, children, pie }) {
  useEffect(() => {
    function alPulsar(evento) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alPulsar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = overflow;
    };
  }, [onCerrar]);

  return (
    <>
      <div className="ls-modal-fondo" onClick={onCerrar} />
      <div className="ls-modal-envoltura">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content shadow">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">{titulo}</h5>
                {subtitulo && <small className="text-body-secondary">{subtitulo}</small>}
              </div>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar} />
            </div>
            <div className="modal-body">{children}</div>
            {pie && <div className="modal-footer">{pie}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function FormularioDinamico({ campos, valores, onCambio, errores, editando }) {
  return (
    <div className="row g-3">
      {campos.map((campo) => {
        if (campo.soloCrear && editando) return null;

        const id = `campo-${campo.name}`;
        const error = errores?.[campo.name];
        const valor = valores[campo.name] ?? '';
        const ancho = campo.tipo === 'area' ? 'col-12' : 'col-12 col-md-6';

        return (
          <div className={ancho} key={campo.name}>
            <label className="form-label fw-semibold small" htmlFor={id}>
              {campo.label}
              {campo.requerido && <span className="text-danger ms-1">*</span>}
            </label>

            {campo.tipo === 'select' ? (
              <select
                id={id}
                className={`form-select ${error ? 'is-invalid' : ''}`}
                value={valor === '' || valor === null ? '' : valor}
                required={campo.requerido}
                onChange={(evento) => onCambio(campo.name, evento.target.value)}
              >
                <option value="">{campo.requerido ? 'Selecciona...' : 'Sin asignar'}</option>
                {campo.opciones?.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
                {campo.filas?.map((fila) => (
                  <option key={fila.id} value={fila.id}>
                    {campo.fuente.etiqueta(fila)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type={campo.tipo === 'numero' ? 'number' : campo.tipo}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                value={valor}
                required={campo.requerido}
                min={campo.tipo === 'numero' ? campo.min : undefined}
                max={campo.tipo === 'numero' ? campo.max : undefined}
                maxLength={campo.tipo === 'numero' ? undefined : campo.max}
                placeholder={campo.placeholder ?? ''}
                autoFocus={campo.autoFocus}
                autoComplete={campo.tipo === 'password' ? 'new-password' : 'off'}
                onChange={(evento) => {
                  const bruto = evento.target.value;
                  onCambio(campo.name, campo.mayusculas ? bruto.toUpperCase() : bruto);
                }}
              />
            )}

            {error && <div className="invalid-feedback d-block">{error}</div>}
            {campo.ayuda && !error && <div className="form-text">{campo.ayuda}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Celda({ columna, fila }) {
  const bruto = fila[columna.clave];

  if (columna.tipo === 'fecha') {
    return bruto ? (
      <span className="text-body-secondary small">{String(bruto).slice(0, 16)}</span>
    ) : (
      <span className="text-body-secondary">—</span>
    );
  }

  const celda = columna.formato ? columna.formato(bruto, fila) : { texto: bruto };

  if (celda.badge) {
    return <span className={`badge text-bg-${celda.badge}`}>{celda.texto}</span>;
  }
  if (celda.texto === null || celda.texto === undefined || celda.texto === '') {
    return <span className="text-body-secondary">{columna.vacio ?? '—'}</span>;
  }
  return celda.texto;
}

export default function CrudPage({ nombre }) {
  const { usuario } = useAuth();
  const config = obtenerEntidad(nombre);

  const [filas, setFilas] = useState([]);
  const [paginacion, setPaginacion] = useState({ page: 1, total: 0, totalPages: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({ sortBy: config.ordenDefecto, order: 'asc' });

  const [modal, setModal] = useState(null);
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [opciones, setOpciones] = useState({});

  // Se incrementa para forzar una recarga sin cambiar los filtros.
  const [disparo, setDisparo] = useState(0);
  const recargar = useCallback(() => setDisparo((n) => n + 1), []);

  const puedeEscribir = config.rolesEscritura.includes(usuario.rol);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);

    api
      .listar(nombre, {
        page: pagina,
        limit: LIMITE_POR_PAGINA,
        q: busquedaAplicada || undefined,
        sortBy: orden.sortBy ?? undefined,
        order: orden.order,
      })
      .then((respuesta) => {
        if (!vivo) return;
        setFilas(respuesta.data);
        setPaginacion(respuesta.pagination);
      })
      .catch((fallo) => {
        if (!vivo) return;
        setError(fallo.message);
        setFilas([]);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, [nombre, pagina, busquedaAplicada, orden.sortBy, orden.order, disparo]);

  useEffect(() => {
    let vivo = true;
    const conFuente = config.campos.filter((campo) => campo.fuente);
    if (conFuente.length === 0) return undefined;

    for (const campo of conFuente) {
      cargarOpciones(campo.fuente.endpoint, campo.fuente.filtro).then((filas) => {
        if (vivo) setOpciones((previas) => ({ ...previas, [campo.name]: filas }));
      });
    }
    return () => {
      vivo = false;
    };
  }, [config]);

  const camposResueltos = useMemo(
    () =>
      config.campos.map((campo) =>
        campo.fuente && opciones[campo.name] ? { ...campo, filas: opciones[campo.name] } : campo,
      ),
    [config.campos, opciones],
  );

  function abrirCrear() {
    const iniciales = {};
    for (const campo of camposResueltos) {
      if (campo.soloCrear) continue;
      iniciales[campo.name] = campo.defaultValor ?? '';
    }
    setValores(iniciales);
    setErrores({});
    setModal({ registro: null });
  }

  function abrirEditar(fila) {
    const iniciales = {};
    for (const campo of camposResueltos) {
      if (campo.soloCrear) continue;
      const bruto = fila[campo.name];
      iniciales[campo.name] = bruto === null || bruto === undefined ? '' : bruto;
    }
    setValores(iniciales);
    setErrores({});
    setModal({ registro: fila });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    setError(null);

    const cuerpo = {};
    for (const campo of camposResueltos) {
      // La contrasena solo se envia al crear; el backend la cambia por
      // /api/auth/password.
      if (campo.soloCrear && modal.registro) continue;

      const valor = valores[campo.name];
      if (valor === '' || valor === null || valor === undefined) {
        if (campo.requerido) continue;
        cuerpo[campo.name] = null;
        continue;
      }
      cuerpo[campo.name] = campo.tipo === 'numero' ? Number(valor) : valor;
    }

    try {
      if (modal.registro) await api.actualizar(nombre, modal.registro.id, cuerpo);
      else await api.crear(nombre, cuerpo);

      invalidarOpciones();
      setModal(null);
      recargar();
    } catch (fallo) {
      // El backend devuelve 422 con un detalle por campo.
      if (fallo instanceof ApiError && fallo.status === 422 && Array.isArray(fallo.details)) {
        const porCampo = {};
        for (const detalle of fallo.details) porCampo[detalle.campo] = detalle.mensaje;
        setErrores(porCampo);
        if (Object.keys(porCampo).length === 0) setError(fallo.message);
      } else {
        setError(fallo.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(fila) {
    const identificador = fila.nombre ?? fila.matricula ?? fila.codigo ?? `#${fila.id}`;
    const confirmado = window.confirm(
      `¿Eliminar ${config.singular} "${identificador}"? Esta accion no se puede deshacer.`,
    );
    if (!confirmado) return;

    setError(null);
    try {
      await api.eliminar(nombre, fila.id);
      invalidarOpciones();
      // Si se borra la ultima fila de la pagina, hay que retroceder.
      if (filas.length === 1 && pagina > 1) setPagina(pagina - 1);
      else recargar();
    } catch (fallo) {
      setError(fallo.message);
    }
  }

  function ordenarPor(columna) {
    setOrden((previa) =>
      previa.sortBy === columna
        ? { sortBy: columna, order: previa.order === 'asc' ? 'desc' : 'asc' }
        : { sortBy: columna, order: 'asc' },
    );
    setPagina(1);
  }

  function buscar(evento) {
    evento.preventDefault();
    setBusquedaAplicada(busqueda.trim());
    setPagina(1);
  }

  const columnasVisibles = config.columnas;
  const numColumnas = columnasVisibles.length + (puedeEscribir ? 1 : 0);
  const hayFiltro = busquedaAplicada !== '';

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">{config.titulo}</h1>
          <p className="text-body-secondary mb-0">
            {paginacion.total} {paginacion.total === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        {puedeEscribir && (
          <button type="button" className="btn btn-primary" onClick={abrirCrear}>
            <i className="bi bi-plus-lg me-1" /> Nuevo {config.singular}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill" />
          <span className="flex-grow-1">{error}</span>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
        </div>
      )}

      <form className="d-flex gap-2 mb-3" onSubmit={buscar} role="search">
        <div className="position-relative flex-grow-1" style={{ maxWidth: 420 }}>
          <span className="ls-campo-icono">
            <i className="bi bi-search" />
          </span>
          <input
            type="search"
            className="form-control ps-5"
            placeholder={`Buscar en ${config.titulo.toLowerCase()}...`}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-outline-secondary">
          Buscar
        </button>
        {hayFiltro && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => {
              setBusqueda('');
              setBusquedaAplicada('');
              setPagina(1);
            }}
          >
            Limpiar
          </button>
        )}
      </form>

      <div className="ls-tabla-envoltura">
        <div className="table-responsive">
          <table className="table ls-tabla hover align-middle">
            <thead>
              <tr>
                {columnasVisibles.map((columna) => (
                  <th
                    key={columna.clave}
                    style={columna.ancho ? { width: columna.ancho } : undefined}
                    className={columna.clase ?? ''}
                  >
                    {columna.orden ? (
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none text-body-secondary fw-semibold"
                        onClick={() => ordenarPor(columna.orden)}
                      >
                        {columna.etiqueta}
                        {orden.sortBy === columna.orden && (
                          <i className={`bi bi-caret-${orden.order === 'asc' ? 'up' : 'down'}-fill ms-1`} />
                        )}
                      </button>
                    ) : (
                      columna.etiqueta
                    )}
                  </th>
                ))}
                {puedeEscribir && <th className="text-end">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={numColumnas} className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                    <span className="ms-2 text-body-secondary">Cargando...</span>
                  </td>
                </tr>
              )}

              {!cargando && filas.length === 0 && (
                <tr>
                  <td colSpan={numColumnas} className="text-center py-5 text-body-secondary">
                    {hayFiltro
                      ? `Sin resultados para "${busquedaAplicada}"`
                      : `Todavia no hay ${config.titulo.toLowerCase()}`}
                  </td>
                </tr>
              )}

              {!cargando &&
                filas.map((fila) => (
                  <tr key={fila.id}>
                    {columnasVisibles.map((columna) => (
                      <td key={columna.clave}>
                        <Celda columna={columna} fila={fila} />
                      </td>
                    ))}
                    {puedeEscribir && (
                      <td>
                        <div className="ls-acciones">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Editar"
                            onClick={() => abrirEditar(fila)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Eliminar"
                            onClick={() => eliminar(fila)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {paginacion.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
            <small className="text-body-secondary">
              Pagina {paginacion.page} de {paginacion.totalPages}
            </small>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pagina <= 1}
                onClick={() => setPagina((n) => n - 1)}
              >
                <i className="bi bi-chevron-left" />
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pagina >= paginacion.totalPages}
                onClick={() => setPagina((n) => n + 1)}
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          titulo={`${modal.registro ? 'Editar' : 'Nuevo'} ${config.singular}`}
          subtitulo={
            modal.registro
              ? `Registro #${modal.registro.id}`
              : `Alta en ${config.titulo.toLowerCase()}`
          }
          onCerrar={() => setModal(null)}
          pie={
            <>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setModal(null)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" form="formulario-entidad" className="btn btn-primary" disabled={guardando}>
                {guardando && <span className="spinner-border spinner-border-sm me-2" />}
                Guardar
              </button>
            </>
          }
        >
          <form id="formulario-entidad" onSubmit={guardar} noValidate>
            <FormularioDinamico
              campos={camposResueltos}
              valores={valores}
              errores={errores}
              editando={Boolean(modal.registro)}
              onCambio={(name, value) => setValores((previas) => ({ ...previas, [name]: value }))}
            />
          </form>
        </Modal>
      )}
    </>
  );
}