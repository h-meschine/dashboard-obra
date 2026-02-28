import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ClipboardList, AlertTriangle, Calendar, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQibGsEG6YpkTPGDi4O5mNYASLsPhMTQ93ZdujIzEQ30CjFRp5T_TIJ6mxoyRKVXfAuz9VCYczsw2-T/pub?gid=2133591064&single=true&output=csv';

function loadPapaParse() {
  return new Promise((resolve, reject) => {
    if (window.Papa) return resolve(window.Papa);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    script.onload = () => resolve(window.Papa);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const FALLBACK_DATA = [
  { id: 1, etapa: "Muro divisa", servico: "Finalizar alvenaria", progresso: 70.25, inicio: "2026-02-20", termino: "2026-03-06", fornecedor: "Sérgio", status: "Alto risco" },
  { id: 2, etapa: "Muro divisa", servico: "Reboco Alvenaria", progresso: 16.25, inicio: "2026-03-09", termino: "2026-03-20", fornecedor: "Sérgio", status: "médio risco" },
  { id: 3, etapa: "Muro divisa", servico: "Requadros de vigas", progresso: 72.25, inicio: "2026-02-26", termino: "2026-03-16", fornecedor: "Sérgio", status: "baixo risco" },
  { id: 4, etapa: "Piscina", servico: "Hidráulica", progresso: 0, inicio: "2026-03-08", termino: "2026-03-26", fornecedor: "Sérgio", status: "baixo risco" },
  { id: 5, etapa: "Pisos internos", servico: "Revestimentos", progresso: 0, inicio: "2026-03-22", termino: "2026-04-09", fornecedor: "Sérgio", status: "médio risco" },
  { id: 6, etapa: "Móveis", servico: "Mobilias planejadas", progresso: 0, inicio: "2026-06-20", termino: "2026-07-08", fornecedor: "Definir", status: "Alto risco" },
];

function parseRow(row, index) {
  const keys = Object.keys(row);
  const get = (...candidates) => {
    const key = keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase())));
    return key ? row[key] : '';
  };
  const progressRaw = get('progresso', 'progress', '%');
  return {
    id: index + 1,
    etapa: get('etapa', 'fase', 'stage') || '',
    servico: get('serviço', 'servico', 'service', 'atividade', 'tarefa') || '',
    progresso: parseFloat(String(progressRaw).replace(',', '.')) || 0,
    inicio: get('início', 'inicio', 'start', 'data inicio') || '',
    termino: get('término', 'termino', 'end', 'fim', 'data fim') || '',
    fornecedor: get('fornecedor', 'supplier', 'responsável', 'responsavel') || '',
    status: get('status', 'risco', 'risk') || 'baixo risco',
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

const getStatusStyle = (status) => {
  const s = status.toLowerCase();
  if (s.includes('alto')) return { badge: 'status-high', bar: '#ef4444' };
  if (s.includes('médio') || s.includes('medio')) return { badge: 'status-mid', bar: '#f59e0b' };
  return { badge: 'status-low', bar: '#10b981' };
};

export default function ProjectDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setUsingFallback(false);
    try {
      const Papa = await loadPapaParse();
      await new Promise((resolve, reject) => {
        Papa.parse(CSV_URL, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setData(results.data.map(parseRow));
              setLastUpdate(new Date());
              resolve();
            } else {
              reject(new Error('Planilha vazia.'));
            }
          },
          error: (err) => reject(err),
        });
      });
    } catch (err) {
      setError('Não foi possível carregar os dados da planilha. Exibindo dados de exemplo.');
      setData(FALLBACK_DATA);
      setUsingFallback(true);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const avgProgress = data.length
    ? (data.reduce((a, c) => a + c.progresso, 0) / data.length).toFixed(1)
    : 0;
  const highRisk = data.filter(d => d.status.toLowerCase().includes('alto')).length;
  const completed = data.filter(d => d.progresso >= 100).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .db { min-height: 100vh; background: #f5f3ef; font-family: 'DM Sans', sans-serif; color: #1a1a18; padding: 2rem; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; gap: 1.5rem; flex-wrap: wrap; }
        .header h1 { font-family: 'DM Serif Display', serif; font-size: clamp(1.6rem, 3vw, 2.4rem); color: #1a1a18; line-height: 1.15; letter-spacing: -0.02em; }
        .header h1 em { font-style: italic; color: #7c6f5e; }
        .header-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.78rem; color: #7c6f5e; font-family: 'DM Mono', monospace; flex-wrap: wrap; }
        .src-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.68rem; font-family: 'DM Mono', monospace; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 500; }
        .src-live { background: #d1fae5; color: #065f46; }
        .src-fallback { background: #fef3c7; color: #92400e; }
        .refresh-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.1rem; background: #1a1a18; color: #f5f3ef; border: none; border-radius: 9px; font-size: 0.82rem; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.15s; white-space: nowrap; }
        .refresh-btn:hover { background: #3a3a35; }
        .refresh-btn:active { transform: scale(0.97); }
        .refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .card { background: #fff; border-radius: 16px; padding: 1.25rem 1.5rem; border: 1px solid #e8e4de; transition: transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
        .card-label { font-size: 0.67rem; font-family: 'DM Mono', monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: #9e9589; display: block; margin-bottom: 0.35rem; }
        .card-value { font-family: 'DM Serif Display', serif; font-size: 2.2rem; color: #1a1a18; line-height: 1; display: block; }
        .card-value.danger { color: #dc2626; }
        .card-value.success { color: #059669; }
        .skeleton { background: linear-gradient(90deg,#e8e4de 25%,#f5f3ef 50%,#e8e4de 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; height: 2.4rem; width: 55%; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .error-banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.82rem; color: #92400e; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        .table-wrap { background: #fff; border-radius: 20px; border: 1px solid #e8e4de; overflow: hidden; }
        .table-head-row { padding: 1rem 1.5rem; border-bottom: 1px solid #f0ece6; display: flex; align-items: center; gap: 0.5rem; background: #faf8f5; }
        .table-head-row span { font-size: 0.8rem; font-weight: 600; color: #4a4640; }
        .count { font-family: 'DM Mono', monospace; font-size: 0.68rem; background: #e8e4de; color: #7c6f5e; padding: 0.1rem 0.55rem; border-radius: 999px; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 0.75rem 1.5rem; font-size: 0.67rem; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 0.07em; color: #9e9589; font-weight: 500; text-align: left; border-bottom: 1px solid #f0ece6; white-space: nowrap; background: #faf8f5; }
        th:last-child { text-align: right; }
        tbody tr { border-bottom: 1px solid #f5f2ee; transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #faf8f5; }
        td { padding: 1rem 1.5rem; vertical-align: middle; }
        .etapa-tag { font-size: 0.63rem; font-family: 'DM Mono', monospace; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: #9e9589; display: block; margin-bottom: 0.15rem; }
        .svc-name { font-weight: 600; font-size: 0.88rem; color: #1a1a18; }
        .progress-cell { min-width: 170px; }
        .prog-row { display: flex; align-items: center; gap: 0.6rem; }
        .prog-track { flex: 1; height: 6px; background: #ede9e3; border-radius: 999px; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .prog-pct { font-family: 'DM Mono', monospace; font-size: 0.7rem; font-weight: 500; color: #7c6f5e; min-width: 38px; text-align: right; }
        .period-cell { font-size: 0.72rem; color: #7c6f5e; white-space: nowrap; }
        .period-cell span { display: block; font-family: 'DM Mono', monospace; font-size: 0.68rem; }
        .chip { display: inline-block; background: #f0ece6; color: #4a4640; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 6px; font-family: 'DM Mono', monospace; }
        .chip-undef { background: #fef3c7; color: #92400e; }
        .badge { display: inline-block; padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.63rem; font-family: 'DM Mono', monospace; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; float: right; }
        .status-high { background: #fee2e2; color: #b91c1c; }
        .status-mid  { background: #fef3c7; color: #b45309; }
        .status-low  { background: #d1fae5; color: #065f46; }
        .empty-state { text-align: center; padding: 3rem; color: #9e9589; font-size: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        @media (max-width: 680px) { .db { padding: 1rem; } .header { flex-direction: column; } th, td { padding: 0.75rem 0.75rem; } }
      `}</style>

      <div className="db">
        <header className="header">
          <div>
            <h1>Relatório de <em>Acompanhamento</em><br />de Obra</h1>
            <div className="header-meta">
              <Calendar size={13} />
              {lastUpdate ? `Atualizado: ${lastUpdate.toLocaleString('pt-BR')}` : 'Carregando…'}
              {!loading && (
                <span className={`src-badge ${usingFallback ? 'src-fallback' : 'src-live'}`}>
                  {usingFallback ? <WifiOff size={10} /> : <Wifi size={10} />}
                  {usingFallback ? 'Offline (exemplo)' : 'Google Sheets'}
                </span>
              )}
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="cards">
          {[
            { label: 'Progresso Geral', value: `${avgProgress}%`, cls: '' },
            { label: 'Alertas Críticos', value: highRisk, cls: highRisk > 0 ? 'danger' : 'success' },
            { label: 'Concluídas',       value: completed,  cls: completed > 0 ? 'success' : '' },
            { label: 'Total de Etapas',  value: data.length, cls: '' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card">
              <span className="card-label">{label}</span>
              {loading ? <div className="skeleton" /> : <span className={`card-value ${cls}`}>{value}</span>}
            </div>
          ))}
        </div>

        <div className="table-wrap">
          <div className="table-head-row">
            <ClipboardList size={15} color="#7c6f5e" />
            <span>Status Detalhado por Etapa</span>
            {!loading && <span className="count">{data.length} itens</span>}
          </div>

          {loading ? (
            <div className="empty-state">
              <RefreshCw size={26} className="spin" />
              <span>Buscando dados da planilha…</span>
            </div>
          ) : data.length === 0 ? (
            <div className="empty-state">Nenhum dado encontrado na planilha.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Etapa / Serviço</th>
                    <th>Progresso</th>
                    <th>Período</th>
                    <th>Fornecedor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const s = getStatusStyle(item.status);
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="etapa-tag">{item.etapa}</span>
                          <span className="svc-name">{item.servico}</span>
                        </td>
                        <td className="progress-cell">
                          <div className="prog-row">
                            <div className="prog-track">
                              <div className="prog-fill" style={{ width: `${Math.min(item.progresso, 100)}%`, backgroundColor: s.bar }} />
                            </div>
                            <span className="prog-pct">{item.progresso}%</span>
                          </div>
                        </td>
                        <td className="period-cell">
                          <span>▸ {formatDate(item.inicio)}</span>
                          <span>◾ {formatDate(item.termino)}</span>
                        </td>
                        <td>
                          <span className={`chip ${item.fornecedor.toLowerCase() === 'definir' ? 'chip-undef' : ''}`}>
                            {item.fornecedor || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.badge}`}>{item.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
