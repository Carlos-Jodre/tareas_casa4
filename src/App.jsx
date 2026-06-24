import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, onSnapshot,
  updateDoc, deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfq4oVaFxhGaqipx52itBxUARcajJhHfA",
  authDomain: "tareas-casa-11c7b.firebaseapp.com",
  projectId: "tareas-casa-11c7b",
  storageBucket: "tareas-casa-11c7b.firebasestorage.app",
  messagingSenderId: "956111451974",
  appId: "1:956111451974:web:aab85979e536d5770e1747"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PALETA = [
  { bg: "#EEF2FF", accent: "#6366F1", light: "#C7D2FE", text: "#3730A3" },
  { bg: "#FFF1F2", accent: "#F43F5E", light: "#FECDD3", text: "#9F1239" },
  { bg: "#F0FDF4", accent: "#22C55E", light: "#BBF7D0", text: "#14532D" },
  { bg: "#FFF7ED", accent: "#F97316", light: "#FED7AA", text: "#7C2D12" },
  { bg: "#F0F9FF", accent: "#0EA5E9", light: "#BAE6FD", text: "#0C4A6E" },
  { bg: "#FDF4FF", accent: "#A855F7", light: "#E9D5FF", text: "#581C87" },
];
const AVATARES = ["🧒", "👦", "👧", "🧑", "👨", "👩", "🧔", "👴", "👵"];

function getColor(index) { return PALETA[index % PALETA.length]; }

export default function App() {
  const [personas, setPersonas] = useState([]);
  const [tareas, setTareas] = useState({});
  const [tab, setTab] = useState(null);
  const [nueva, setNueva] = useState("");
  const [cargando, setCargando] = useState(true);

  // Modal añadir persona
  const [modalPersona, setModalPersona] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoAvatar, setNuevoAvatar] = useState(AVATARES[0]);

  // Modal editar persona
  const [modalEditar, setModalEditar] = useState(null); // { id, nombre, avatar }
  const [editNombre, setEditNombre] = useState("");
  const [editAvatar, setEditAvatar] = useState(AVATARES[0]);

  // Confirmar eliminar
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "personas"), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setPersonas(lista);
      if (lista.length > 0 && !tab) setTab(lista[0].id);
      setCargando(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (personas.length === 0) return;
    const unsubs = personas.map(p =>
      onSnapshot(collection(db, "personas", p.id, "tareas"), snap => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.creadoEn?.seconds ?? 0) - (b.creadoEn?.seconds ?? 0));
        setTareas(prev => ({ ...prev, [p.id]: lista }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [personas]);

  async function añadirPersona() {
    if (!nuevoNombre.trim()) return;
    await addDoc(collection(db, "personas"), {
      nombre: nuevoNombre.trim(),
      avatar: nuevoAvatar,
      orden: personas.length,
    });
    setNuevoNombre("");
    setNuevoAvatar(AVATARES[0]);
    setModalPersona(false);
  }

  function abrirEditar(persona) {
    setModalEditar(persona);
    setEditNombre(persona.nombre);
    setEditAvatar(persona.avatar);
  }

  async function guardarEdicion() {
    if (!editNombre.trim() || !modalEditar) return;
    await updateDoc(doc(db, "personas", modalEditar.id), {
      nombre: editNombre.trim(),
      avatar: editAvatar,
    });
    setModalEditar(null);
  }

  async function eliminarPersona(id) {
    const ts = tareas[id] || [];
    await Promise.all(ts.map(t => deleteDoc(doc(db, "personas", id, "tareas", t.id))));
    await deleteDoc(doc(db, "personas", id));
    setConfirmarEliminar(null);
    if (tab === id) setTab(personas.find(p => p.id !== id)?.id || null);
  }

  async function añadirTarea() {
    if (!nueva.trim() || !tab) return;
    await addDoc(collection(db, "personas", tab, "tareas"), {
      texto: nueva.trim(),
      hecha: false,
      creadoEn: serverTimestamp(),
    });
    setNueva("");
  }

  async function toggleTarea(personaId, tareaId, hecha) {
    await updateDoc(doc(db, "personas", personaId, "tareas", tareaId), { hecha: !hecha });
  }

  async function eliminarTarea(personaId, tareaId) {
    await deleteDoc(doc(db, "personas", personaId, "tareas", tareaId));
  }

  async function limpiarHechas(personaId) {
    const hechas = (tareas[personaId] || []).filter(t => t.hecha);
    await Promise.all(hechas.map(t => deleteDoc(doc(db, "personas", personaId, "tareas", t.id))));
  }

  if (cargando) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", color: "#94A3B8" }}>
        <p style={{ fontSize: 36, margin: "0 0 8px" }}>🏠</p>
        <p style={{ fontSize: 15 }}>Cargando...</p>
      </div>
    </div>
  );

  const persona = personas.find(p => p.id === tab);
  const c = persona ? getColor(personas.indexOf(persona)) : PALETA[0];
  const tareasPersona = (tab && tareas[tab]) || [];
  const pendientes = tareasPersona.filter(t => !t.hecha).length;
  const hechas = tareasPersona.filter(t => t.hecha).length;
  const total = tareasPersona.length;
  const progreso = total === 0 ? 0 : Math.round((hechas / total) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ width: "100%", background: "#1E293B", padding: "20px 24px 0", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 2px", letterSpacing: 1, textTransform: "uppercase" }}>Hogar</p>
              <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, margin: 0 }}>Tareas del hogar</h1>
            </div>
            <button onClick={() => setModalPersona(true)} style={{
              background: "#334155", border: "none", borderRadius: 10,
              color: "#F1F5F9", fontSize: 13, fontWeight: 600,
              padding: "8px 14px", cursor: "pointer",
            }}>＋ Persona</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", overflowX: "auto", gap: 2 }}>
            {personas.map((p, i) => {
              const col = getColor(i);
              const pts = (tareas[p.id] || []).filter(t => !t.hecha).length;
              return (
                <button key={p.id} onClick={() => setTab(p.id)} style={{
                  flexShrink: 0, padding: "10px 14px", background: "none", border: "none",
                  borderBottom: tab === p.id ? `3px solid ${col.accent}` : "3px solid transparent",
                  color: tab === p.id ? "#F1F5F9" : "#64748B",
                  fontWeight: tab === p.id ? 600 : 400, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                }}>
                  <span>{p.avatar}</span>
                  <span>{p.nombre}</span>
                  {pts > 0 && (
                    <span style={{ background: col.accent, color: "white", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{pts}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 480, width: "100%", padding: "20px 16px 0", boxSizing: "border-box" }}>

        {personas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
            <p style={{ fontSize: 40, margin: "0 0 12px" }}>👨‍👩‍👧‍👦</p>
            <p style={{ fontSize: 16, margin: "0 0 8px", color: "#475569", fontWeight: 600 }}>Aún no hay nadie</p>
            <p style={{ fontSize: 14, margin: 0 }}>Pulsa "+ Persona" para empezar</p>
          </div>
        ) : persona ? (
          <>
            {/* Tarjeta persona */}
            <div style={{ background: c.bg, borderRadius: 16, padding: "16px 20px", marginBottom: 20, border: `1px solid ${c.light}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 30 }}>{persona.avatar}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: c.text }}>{persona.nombre}</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                      <button onClick={() => abrirEditar(persona)} style={{
                        background: "none", border: "none", color: c.accent, fontSize: 12,
                        cursor: "pointer", padding: 0, fontWeight: 500,
                      }}>✏️ Editar</button>
                      <button onClick={() => setConfirmarEliminar(persona.id)} style={{
                        background: "none", border: "none", color: "#EF4444", fontSize: 12,
                        cursor: "pointer", padding: 0, fontWeight: 500,
                      }}>🗑 Eliminar</button>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.accent }}>{progreso}%</p>
                  <p style={{ margin: 0, fontSize: 12, color: c.text, opacity: 0.7 }}>{hechas}/{total} hechas</p>
                </div>
              </div>
              <div style={{ background: c.light, borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${progreso}%`, height: "100%", background: c.accent, borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Añadir tarea */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={nueva} onChange={e => setNueva(e.target.value)}
                onKeyDown={e => e.key === "Enter" && añadirTarea()}
                placeholder="Nueva tarea..."
                style={{ flex: 1, padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", background: "white", color: "#1E293B" }} />
              <button onClick={añadirTarea} style={{
                background: c.accent, color: "white", border: "none", borderRadius: 12,
                padding: "12px 18px", fontSize: 20, cursor: "pointer", fontWeight: 700,
              }}>+</button>
            </div>

            {pendientes > 0 && (
              <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Pendientes · {pendientes}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tareasPersona.filter(t => !t.hecha).map(t => (
                <TareaItem key={t.id} tarea={t} color={c}
                  onToggle={() => toggleTarea(tab, t.id, t.hecha)}
                  onDelete={() => eliminarTarea(tab, t.id)} />
              ))}
            </div>

            {hechas > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 8px" }}>
                  <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>
                    Completadas · {hechas}
                  </p>
                  <button onClick={() => limpiarHechas(tab)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                    Borrar todas
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tareasPersona.filter(t => t.hecha).map(t => (
                    <TareaItem key={t.id} tarea={t} color={c}
                      onToggle={() => toggleTarea(tab, t.id, t.hecha)}
                      onDelete={() => eliminarTarea(tab, t.id)} />
                  ))}
                </div>
              </>
            )}

            {total === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                <p style={{ fontSize: 36, margin: "0 0 8px" }}>✅</p>
                <p style={{ fontSize: 15, margin: 0 }}>Sin tareas. ¡Añade una!</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Modal añadir persona */}
      {modalPersona && (
        <Modal onClose={() => setModalPersona(false)}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 17, color: "#1E293B" }}>Nueva persona</p>
          <input autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && añadirPersona()}
            placeholder="Nombre..."
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B", fontWeight: 500 }}>Elige un avatar</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {AVATARES.map(a => (
              <button key={a} onClick={() => setNuevoAvatar(a)} style={{
                fontSize: 24, background: nuevoAvatar === a ? "#EEF2FF" : "white",
                border: nuevoAvatar === a ? "2px solid #6366F1" : "2px solid #E2E8F0",
                borderRadius: 10, padding: "6px 10px", cursor: "pointer",
              }}>{a}</button>
            ))}
          </div>
          <button onClick={añadirPersona} style={{
            width: "100%", background: "#6366F1", color: "white", border: "none",
            borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Añadir</button>
        </Modal>
      )}

      {/* Modal editar persona */}
      {modalEditar && (
        <Modal onClose={() => setModalEditar(null)}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 17, color: "#1E293B" }}>Editar persona</p>
          <input autoFocus value={editNombre} onChange={e => setEditNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardarEdicion()}
            placeholder="Nombre..."
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B", fontWeight: 500 }}>Elige un avatar</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {AVATARES.map(a => (
              <button key={a} onClick={() => setEditAvatar(a)} style={{
                fontSize: 24, background: editAvatar === a ? "#EEF2FF" : "white",
                border: editAvatar === a ? "2px solid #6366F1" : "2px solid #E2E8F0",
                borderRadius: 10, padding: "6px 10px", cursor: "pointer",
              }}>{a}</button>
            ))}
          </div>
          <button onClick={guardarEdicion} style={{
            width: "100%", background: "#6366F1", color: "white", border: "none",
            borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Guardar cambios</button>
        </Modal>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <Modal onClose={() => setConfirmarEliminar(null)}>
          <p style={{ fontSize: 36, textAlign: "center", margin: "0 0 12px" }}>⚠️</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#1E293B", textAlign: "center", margin: "0 0 8px" }}>
            ¿Eliminar a {personas.find(p => p.id === confirmarEliminar)?.nombre}?
          </p>
          <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", margin: "0 0 20px" }}>
            Se eliminarán también todas sus tareas.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmarEliminar(null)} style={{
              flex: 1, background: "#F1F5F9", border: "none", borderRadius: 12,
              padding: 13, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#475569",
            }}>Cancelar</button>
            <button onClick={() => eliminarPersona(confirmarEliminar)} style={{
              flex: 1, background: "#EF4444", border: "none", borderRadius: 12,
              padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", color: "white",
            }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 40px", width: "100%", maxWidth: 480, boxSizing: "border-box",
      }}>
        {children}
      </div>
    </div>
  );
}

function TareaItem({ tarea, color: c, onToggle, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, background: "white",
      borderRadius: 12, padding: "13px 14px", border: "1.5px solid",
      borderColor: tarea.hecha ? "#F1F5F9" : "#E2E8F0",
      opacity: tarea.hecha ? 0.65 : 1,
      boxShadow: tarea.hecha ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <button onClick={onToggle} style={{
        width: 24, height: 24, borderRadius: 99, flexShrink: 0,
        border: `2px solid ${tarea.hecha ? c.accent : "#CBD5E1"}`,
        background: tarea.hecha ? c.accent : "white",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
      }}>
        {tarea.hecha && <span style={{ color: "white", fontSize: 13 }}>✓</span>}
      </button>
      <span style={{ flex: 1, fontSize: 15, color: "#1E293B", textDecoration: tarea.hecha ? "line-through" : "none" }}>
        {tarea.texto}
      </span>
      <button onClick={onDelete} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 16, padding: "0 2px" }}>×</button>
    </div>
  );
}
