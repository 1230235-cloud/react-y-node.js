import { useRef, useState } from 'react';
import { api, ApiError } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from '../components/DashboardLayout.jsx';

const ETIQUETA_ROL = { admin: 'Administrador', maestro: 'Maestro', alumno: 'Alumno' };

const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp';
const TAMANO_MAXIMO = 2 * 1024 * 1024;

export default function Perfil() {
  const { usuario, refrescar } = useAuth();
  const inputFichero = useRef(null);

  const [subiendo, setSubiendo] = useState(false);
  const [avisoFoto, setAvisoFoto] = useState(null);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errorPassword, setErrorPassword] = useState(null);
  const [okPassword, setOkPassword] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  async function subirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    setAvisoFoto(null);

    if (!TIPOS_ACEPTADOS.split(',').includes(archivo.type)) {
      setAvisoFoto({ tipo: 'danger', texto: 'Formato no permitido. Usa JPEG, PNG o WEBP.' });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setAvisoFoto({ tipo: 'danger', texto: 'La imagen supera el maximo de 2 MB.' });
      return;
    }

    setSubiendo(true);
    try {
      await api.subirFoto(archivo);
      await refrescar();
      setAvisoFoto({ tipo: 'success', texto: 'Foto actualizada.' });
    } catch (fallo) {
      setAvisoFoto({
        tipo: 'danger',
        texto: fallo instanceof ApiError ? fallo.message : 'No se pudo subir la foto',
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function cambiarPassword(evento) {
    evento.preventDefault();
    setErrorPassword(null);
    setOkPassword(false);

    if (nueva !== repetir) {
      setErrorPassword('Las contrasenas nuevas no coinciden');
      return;
    }

    setGuardandoPassword(true);
    try {
      await api.cambiarPassword(actual, nueva);
      setActual('');
      setNueva('');
      setRepetir('');
      setOkPassword(true);
    } catch (fallo) {
      setErrorPassword(fallo instanceof ApiError ? fallo.message : 'No se pudo cambiar la contrasena');
    } finally {
      setGuardandoPassword(false);
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Mi perfil</h1>

      <div className="row g-4">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm text-center">
            <div className="card-body p-4">
              <Avatar
                usuario={usuario}
                className="ls-foto-perfil ls-foto-vacia"
                style={{ marginBottom: '1.25rem' }}
              />

              <h2 className="h5 mb-1">{usuario.nombre}</h2>
              <p className="text-body-secondary small mb-2">{usuario.email}</p>
              <span
                className={`badge ${
                  usuario.rol === 'admin'
                    ? 'text-bg-danger'
                    : usuario.rol === 'maestro'
                      ? 'text-bg-primary'
                      : 'text-bg-secondary'
                }`}
              >
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </span>
              <p className="text-body-secondary small mt-3 mb-0">
                Alta: {String(usuario.creado_en ?? '').slice(0, 10)}
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h2 className="h5">Foto de perfil</h2>
              <p className="text-body-secondary small">
                JPEG, PNG o WEBP. Maximo 2 MB. La imagen se renombra en el servidor.
              </p>

              {avisoFoto && (
                <div className={`alert alert-${avisoFoto.tipo} py-2 small`} role="alert">
                  {avisoFoto.texto}
                </div>
              )}

              <input
                ref={inputFichero}
                type="file"
                className="d-none"
                accept={TIPOS_ACEPTADOS}
                onChange={subirFoto}
              />
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => inputFichero.current?.click()}
                disabled={subiendo}
              >
                {subiendo && <span className="spinner-border spinner-border-sm me-2" />}
                {usuario.foto ? 'Cambiar foto' : 'Subir foto'}
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <h2 className="h5">Cambiar contrasena</h2>

              {okPassword && (
                <div className="alert alert-success py-2 small" role="alert">
                  <i className="bi bi-check-circle-fill me-1" /> Contrasena actualizada.
                </div>
              )}
              {errorPassword && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {errorPassword}
                </div>
              )}

              <form onSubmit={cambiarPassword} noValidate>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small" htmlFor="pw-actual">
                      Contrasena actual
                    </label>
                    <input
                      id="pw-actual"
                      type="password"
                      className="form-control"
                      value={actual}
                      onChange={(evento) => setActual(evento.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small" htmlFor="pw-nueva">
                      Contrasena nueva
                    </label>
                    <input
                      id="pw-nueva"
                      type="password"
                      className="form-control"
                      value={nueva}
                      onChange={(evento) => setNueva(evento.target.value)}
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                    />
                    <div className="form-text">
                      Minimo 8 caracteres, con al menos una letra y un numero.
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold small" htmlFor="pw-repetir">
                      Repetir contrasena
                    </label>
                    <input
                      id="pw-repetir"
                      type="password"
                      className={`form-control ${nueva && nueva !== repetir ? 'is-invalid' : ''}`}
                      value={repetir}
                      onChange={(evento) => setRepetir(evento.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    {nueva && nueva !== repetir && (
                      <div className="invalid-feedback">No coinciden</div>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary mt-4" disabled={guardandoPassword}>
                  {guardandoPassword && <span className="spinner-border spinner-border-sm me-2" />}
                  Actualizar contrasena
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}