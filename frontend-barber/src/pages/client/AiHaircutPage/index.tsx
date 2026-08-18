import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiAward, FiCamera, FiClock, FiRefreshCw, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Button, ClientPageShell, ClientState, ImageUpload, Pagination, Spinner, useToast } from '../../../components/common';
import { useGetMyMembershipQuery } from '../../../services/membershipApi';
import { useGetHistorialAnalisisCorteQuery } from '../../../services/analisisCorteApi';
import { analizarCorte } from '../../../services/analisisCorte.service';
import { FaceScanLoader } from '../../../components/analisis-corte/FaceScanLoader';
import { ConsentModal } from '../../../components/analisis-corte/ConsentModal';
import { RecomendacionDetalle } from '../../../components/analisis-corte/RecomendacionDetalle';
import { HistorialDetalleModal } from '../../../components/analisis-corte/HistorialDetalleModal';
import { formatDate } from '../../../utils/formatDate';
import { getAccessToken } from '../../../services/api';
import type { AnalisisCorteCreado, AnalisisCorteRecord } from '../../../types/analisisCorte';

export default function AiHaircutPage() {
  const token = getAccessToken();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: membershipData, isLoading: isLoadingMembership } = useGetMyMembershipQuery();
  const [historyPage, setHistoryPage] = useState(1);
  const { data: historialData, isLoading: isLoadingHistorial, isError: historyError, refetch: refetchHistorial } = useGetHistorialAnalisisCorteQuery({ page: historyPage, limit: 6 });
  const historial = historialData?.historial ?? [];
  const cupo = historialData?.cupo;
  const yaConsintio = historialData?.consentimientoAceptado ?? false;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultado, setResultado] = useState<AnalisisCorteCreado | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentMode, setConsentMode] = useState<'gate' | 'retry'>('gate');
  const [sessionConsentAccepted, setSessionConsentAccepted] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<AnalisisCorteRecord | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!token) return <Navigate to="/login" replace />;
  if (isLoadingMembership) return <div className="flex min-h-screen items-center justify-center bg-[#080808]"><Spinner size="lg" /></div>;
  const active = membershipData?.active;
  const puedeCargarImagen = yaConsintio || sessionConsentAccepted;
  const ultimoAnalisis = historial[0] ?? null;
  const enCupo = cupo ? !cupo.disponible : false;
  const proximaFecha = cupo?.proximaFechaDisponible ? new Date(cupo.proximaFechaDisponible) : null;

  const handleFileSelect = (selected: File | null) => { setFile(selected); setResultado(null); if (preview) URL.revokeObjectURL(preview); setPreview(selected ? URL.createObjectURL(selected) : null); };
  const runAnalysis = async (aceptaConsentimiento?: boolean) => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const data = await analizarCorte(file, aceptaConsentimiento);
      setResultado(data); setConsentOpen(false); void refetchHistorial();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'CONSENT_REQUIRED') { setConsentMode('retry'); setConsentOpen(true); } else { showToast(error.message ?? 'Error al analizar la foto', 'error'); if (error.code === 'QUOTA_EXCEEDED') void refetchHistorial(); }
    } finally { setIsAnalyzing(false); }
  };
  const handleConsentAccept = () => { if (consentMode === 'retry') { void runAnalysis(true); return; } setSessionConsentAccepted(true); setConsentOpen(false); };

  const mainPanel = isAnalyzing ? <FaceScanLoader /> : resultado ? <div className="rounded-2xl border border-emerald-500/20 bg-[#121212] p-5"><RecomendacionDetalle resultado={resultado} analisisId={resultado.id} fotoUrl={preview} /><div className="mt-5 rounded-xl border border-[#292929] bg-[#181818] p-3 text-[12px] leading-5 text-[#8a8a8a]"><FiClock className="mr-2 inline text-[#FF7A33]" aria-hidden="true" />Podés volver a analizarte {proximaFecha ? `a partir del ${formatDate(proximaFecha.toISOString())}` : 'cuando se habilite tu próximo cupo'}.</div><Button className="mt-5" onClick={() => navigate('/reservar')} icon={FiScissors}>Reservar turno</Button></div> : isLoadingHistorial ? <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#292929] bg-[#121212]"><Spinner /></div> : historyError ? <ClientState icon={FiRefreshCw} title="No pudimos cargar tu historial" description="Revisá tu conexión y volvé a intentarlo." actionLabel="Reintentar" onAction={() => void refetchHistorial()} tone="danger" /> : enCupo && ultimoAnalisis ? <div className="rounded-2xl border border-amber-500/20 bg-[#121212] p-8 text-center"><FiClock className="mx-auto h-8 w-8 text-amber-400" aria-hidden="true" /><h2 className="mt-4 text-[18px] font-semibold text-white">Ya usaste tu análisis de este mes</h2><p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#858585]">Podés volver a analizarte {proximaFecha ? `a partir del ${formatDate(proximaFecha.toISOString())}` : 'cuando se habilite tu próximo cupo'}.</p></div> : <div className="rounded-2xl border border-[#292929] bg-[#121212] p-5">{puedeCargarImagen ? <ImageUpload variant="box" onFileSelect={handleFileSelect} capture="user" helperText="Subí una foto de frente, con buena luz y sin nada que tape tu cara." /> : <button type="button" onClick={() => { setConsentMode('gate'); setConsentOpen(true); }} className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#3a3a3a] bg-[#171717] px-5 text-center transition-colors hover:border-[#FF5C00]/60"><FiCamera className="h-8 w-8 text-[#FF7A33]" aria-hidden="true" /><span className="mt-3 text-[13px] font-medium text-white">Agregar una foto</span><span className="mt-1 text-[11px] text-[#666]">Te vamos a pedir tu consentimiento antes de subirla</span></button>}<div className="mt-4 flex justify-end"><Button onClick={() => void runAnalysis(!yaConsintio ? true : undefined)} disabled={!file} icon={FiCamera}>Analizar foto</Button></div></div>;

  return <ClientPageShell eyebrow="Recomendación IA" icon={FiCamera}>
    {!active ? <ClientState icon={FiAward} title="Beneficio exclusivo para miembros" description="Activá tu membresía para recibir recomendaciones personalizadas y visualizar ejemplos de cortes." /> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><AnimatedContainer animation="fadeInUp">{mainPanel}</AnimatedContainer><AnimatedContainer animation="fadeInUp" delay={0.08} className="rounded-2xl border border-[#292929] bg-[#121212] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#666]">Historial</p><h2 className="mt-1 text-[16px] font-semibold text-white">Tus análisis</h2></div><span className="text-[11px] text-[#666]">{historialData?.total ?? 0}</span></div>{historial.length === 0 ? <p className="mt-5 text-[12px] text-[#777]">Todavía no hiciste ningún análisis.</p> : <div className="mt-4 grid gap-2">{historial.map((item) => <button key={item.id} type="button" onClick={() => setDetalleSeleccionado(item)} className="rounded-xl border border-[#292929] bg-[#181818] p-3 text-left transition-colors hover:border-[#FF5C00]/50"><div className="flex items-center justify-between gap-2"><p className="truncate text-[12px] font-medium capitalize text-white">{item.resultado.formaCara}</p><span className="shrink-0 text-[10px] text-[#666]">{formatDate(item.createdAt)}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#777]">{item.resultado.cortesRecomendados.map((corte) => corte.nombreCorte).join(', ')}</p></button>)}{historialData && historialData.totalPages > 1 && <Pagination currentPage={historyPage} totalPages={historialData.totalPages} onPageChange={setHistoryPage} />}</div>}</AnimatedContainer></div>}
    <ConsentModal isOpen={consentOpen} onClose={() => setConsentOpen(false)} onAccept={handleConsentAccept} loading={isAnalyzing} /><HistorialDetalleModal record={detalleSeleccionado} onClose={() => setDetalleSeleccionado(null)} />
  </ClientPageShell>;
}
