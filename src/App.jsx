import { useState, useEffect } from "react";

const PERSONAS = ["Persona 1", "Persona 2"];

const TAREAS_INICIALES = {
  "Persona 1": [
    { id: 1, texto: "Hacer la compra", hecha: false },
    { id: 2, texto: "Pasar el aspirador", hecha: false },
    { id: 3, texto: "Limpiar el baño", hecha: false },
  ],
  "Persona 2": [
    { id: 4, texto: "Fregar los platos", hecha: false },
    { id: 5, texto: "Sacar la basura", hecha: false },
    { id: 6, texto: "Limpiar la cocina", hecha: false },
  ],
};

const COLORES = {
  "Persona 1": { bg: "#EEF2FF", accent: "#6366F1", light: "#C7D2FE", text: "#3730A3" },
  "Persona 2": { bg: "#FFF1F2", accent: "#F43F5E", light: "#FECDD3", text: "#9F1239" },
};

const AVATARES = { "Persona 1": "🧑", "Persona 2": "🧑" };

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

export default function App() {
  const [nombres, setNombres] = useLocalStorage("nombres", { "Persona 1": "Persona 1", "Persona 2": "Persona 2" });
  const [tareas, setTareas] = useLocalStorage("tareas", TAREAS_INICIALES);
  const [tab, setTab] = useState("Persona 1");
  const [nueva, setNueva] = useState("");
  const [editandoNombre, setEditandoNombre] = useState(null);
  const [nombreTemp, setNombreTemp] = useState("");
  const [nextId, setNextId] = useLocalStorage("nextId", 7);

  const persona = tab;
  const c = COLORES[persona];
  const nombre = nombres[persona];

  function toggleTarea(id) {
    setTareas(prev => ({
      ...prev,
      [persona]: prev[persona].map(t => t.id === id ? { ...t, hecha: !t.hecha } : t)
    }));
  }

  function añadirTarea() {
    if (!nueva.trim()) return;
    setTareas(prev => ({
      ...prev,
      [persona]: [...prev[persona], { id: nextId, texto: nueva.trim(), hecha: false }]
    }));
    setNextId(n => n + 1);
    setNueva("");
  }

  function eliminarTarea(id) {
    setTareas(prev => ({
      ...prev,
      [persona]: prev[persona].filter(t => t.id !== id)
    }));
  }

  function limpiarHechas() {
    setTareas(prev => ({
      ...prev,
      [persona]: prev[persona].filter(t => !t.hecha)
    }));
  }

  function guardarNombre() {
    if (!nombreTemp.trim()) return;
    setNombres(prev => ({ ...prev, [editandoNombre]: nombreTemp.trim() }));
    setEditandoNombre(null);
  }

  const pendientes = tareas[persona].filter(t => !t.hecha).length;
  const hechas = tareas[persona].filter(t => t.hecha).length;
  const total = tareas[persona].length;
  const progreso = total === 0 ? 0 : Math.round((hechas / total) * 100);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8FAFC",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        width: "100%",
        background: "#1E293B",
        padding: "20px 24px 16px",
        boxSizing: "border-box",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <p style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 2px", letterSpacing: 1, textTransform: "uppercase" }}>Hogar</p>
          <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, margin: 0 }}>Tareas del hogar</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        width: "100%",
        background: "#1E293B",
        borderBottom: "1px solid #334155",
        boxSizing: "border-box",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex" }}>
          {PERSONAS.map(p => (
            <button
              key={p}
              onClick={() => setTab(p)}
              style={{
                flex: 1,
                padding: "12px 8px",
                background: "none",
                border: "none",
                borderBottom: tab === p ? `3px solid ${COLORES[p].accent}` : "3px solid transparent",
                color: tab === p ? "#F1F5F9" : "#64748B",
                fontWeight: tab === p ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              <span>{AVATARES[p]}</span>
              <span>{nombres[p]}</span>
              {tareas[p].filter(t => !t.hecha).length > 0 && (
                <span style={{
                  background: COLORES[p].accent,
                  color: "white",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                  minWidth: 18,
                  textAlign: "center",
                }}>
                  {tareas[p].filter(t => !t.hecha).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 480, width: "100%", padding: "20px 16px 0", boxSizing: "border-box" }}>

        {/* Tarjeta de persona */}
        <div style={{
          background: c.bg,
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 20,
          border: `1px solid ${c.light}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>{AVATARES[persona]}</span>
              {editandoNombre === persona ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    value={nombreTemp}
                    onChange={e => setNombreTemp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && guardarNombre()}
                    style={{
                      border: `1.5px solid ${c.accent}`,
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: c.text,
                      background: "white",
                      outline: "none",
                      width: 130,
                    }}
                  />
                  <button onClick={guardarNombre} style={{
                    background: c.accent, color: "white", border: "none",
                    borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}>✓</button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: c.text }}>{nombre}</p>
                  <button onClick={() => { setEditandoNombre(persona); setNombreTemp(nombre); }}
                    style={{ background: "none", border: "none", color: c.accent, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>
                    ✏️ Cambiar nombre
                  </button>
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.accent }}>{progreso}%</p>
              <p style={{ margin: 0, fontSize: 12, color: c.text, opacity: 0.7 }}>{hechas}/{total} hechas</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ background: c.light, borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${progreso}%`,
              height: "100%",
              background: c.accent,
              borderRadius: 99,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* Añadir tarea */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === "Enter" && añadirTarea()}
            placeholder="Nueva tarea..."
            style={{
              flex: 1,
              padding: "12px 14px",
              border: "1.5px solid #E2E8F0",
              borderRadius: 12,
              fontSize: 15,
              outline: "none",
              background: "white",
              color: "#1E293B",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          />
          <button
            onClick={añadirTarea}
            style={{
              background: c.accent,
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px 18px",
              fontSize: 20,
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: `0 2px 8px ${c.accent}55`,
            }}
          >+</button>
        </div>

        {/* Lista de tareas */}
        {pendientes > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Pendientes · {pendientes}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tareas[persona].filter(t => !t.hecha).map(t => (
            <TareaItem key={t.id} tarea={t} color={c} onToggle={toggleTarea} onDelete={eliminarTarea} />
          ))}
        </div>

        {hechas > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 8px" }}>
              <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>
                Completadas · {hechas}
              </p>
              <button onClick={limpiarHechas} style={{
                background: "none", border: "none", color: "#94A3B8",
                fontSize: 12, cursor: "pointer", fontWeight: 500,
              }}>Borrar todas</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tareas[persona].filter(t => t.hecha).map(t => (
                <TareaItem key={t.id} tarea={t} color={c} onToggle={toggleTarea} onDelete={eliminarTarea} />
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
      </div>
    </div>
  );
}

function TareaItem({ tarea, color: c, onToggle, onDelete }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "white",
      borderRadius: 12,
      padding: "13px 14px",
      border: "1.5px solid",
      borderColor: tarea.hecha ? "#F1F5F9" : "#E2E8F0",
      opacity: tarea.hecha ? 0.65 : 1,
      boxShadow: tarea.hecha ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
      transition: "all 0.15s",
    }}>
      <button
        onClick={() => onToggle(tarea.id)}
        style={{
          width: 24, height: 24, borderRadius: 99, flexShrink: 0,
          border: `2px solid ${tarea.hecha ? c.accent : "#CBD5E1"}`,
          background: tarea.hecha ? c.accent : "white",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
          padding: 0,
        }}
      >
        {tarea.hecha && <span style={{ color: "white", fontSize: 13, lineHeight: 1 }}>✓</span>}
      </button>
      <span style={{
        flex: 1, fontSize: 15, color: "#1E293B",
        textDecoration: tarea.hecha ? "line-through" : "none",
      }}>{tarea.texto}</span>
      <button
        onClick={() => onDelete(tarea.id)}
        style={{
          background: "none", border: "none", color: "#CBD5E1",
          cursor: "pointer", fontSize: 16, padding: "0 2px",
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}
