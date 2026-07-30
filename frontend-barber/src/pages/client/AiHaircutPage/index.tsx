import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiAward, FiCamera, FiClock, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Button, ImageUpload, Spinner, useToast } from '../../../components/common';
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
  const {
    data: historialData,
    isLoading: isLoadingHistorial,
    refetch: refetchHistorial,
  } = useGetHistorialAnalisisCorteQuery();
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!token) return <Navigate to="/login" replace />;

  const active = membershipData?.active;
  const puedeCargarImagen = yaConsintio || sessionConsentAccepted;

  const ultimoAnalisis = historial[0] ?? null;
  const enCupo = cupo ? !cupo.disponible : false;
  const proximaFecha = cupo?.proximaFechaDisponible ? new Date(cupo.proximaFechaDisponible) : null;

  const handleFileSelect = (selected: File | null) => {
    setFile(selected);
    setResultado(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  };

  const MIN_ANALYSIS_LOADING_MS = 3000;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runAnalysis = async (aceptaConsentimiento?: boolean) => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const [data] = await Promise.all([
        analizarCorte(file, aceptaConsentimiento),
        delay(MIN_ANALYSIS_LOADING_MS),
      ]);
      setResultado(data);
      setConsentOpen(false);
      refetchHistorial();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'CONSENT_REQUIRED') {
        setConsentMode('retry');
        setConsentOpen(true);
      } else {
        showToast(error.message ?? 'Error al analizar la foto', 'error');
        if (error.code === 'QUOTA_EXCEEDED') {
          refetchHistorial();
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddImageClick = () => {
    setConsentMode('gate');
    setConsentOpen(true);
  };

  const handleAnalyzeClick = () => runAnalysis(!yaConsintio ? true : undefined);

  const handleConsentAccept = () => {
    if (consentMode === 'retry') {
      runAnalysis(true);
      return;
    }
    setSessionConsentAccepted(true);
    setConsentOpen(false);
  };

  if (isLoadingMembership) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <AnimatedContainer animation="fadeInUp">
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#FF5C00]/10">
                  <FiCamera className="text-[#FF5C00] text-4xl" />
                </div>
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Recomendación de corte con IA</h2>
              <p className="text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-8">
                Este beneficio es exclusivo para clientes con membresía activa. Subí una foto y te recomendamos
                cortes reales según la forma de tu cara.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => navigate('/mi-membresia')} icon={FiAward}>
                  Ver mi membresía
                </Button>
              </div>
            </div>
          </AnimatedContainer>
        </div>
      </div>
    );
  }

  const renderMainPanel = () => {
    if (isAnalyzing) {
      return <FaceScanLoader />;
    }

    if (resultado) {
      return (
        <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6">
          <RecomendacionDetalle resultado={resultado} analisisId={resultado.id} fotoUrl={preview} />

          <div className="mt-5 flex items-start gap-2 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-3">
            <FiClock className="mt-0.5 shrink-0 text-[#FF5C00]" />
            <p className="text-[12px] text-[#8A8A8A]">
              Ya usaste tu análisis de este mes. Vas a poder hacer uno nuevo a partir del{' '}
              <span className="text-white font-medium">
                {proximaFecha ? formatDate(proximaFecha.toISOString()) : ''}
              </span>
              .
            </p>
          </div>

          <div className="mt-6">
            <Button onClick={() => navigate('/reservar')} icon={FiScissors}>
              Reservar turno
            </Button>
          </div>
        </div>
      );
    }

    if (isLoadingHistorial) {
      return (
        <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-10 flex justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (enCupo && ultimoAnalisis) {
      return (
        <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#FF5C00]/10">
              <FiClock className="text-[#FF5C00] text-4xl" />
            </div>
          </div>
          <h2 className="text-[20px] font-bold text-white mb-2">Ya usaste tu análisis de este mes</h2>
          <p className="text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-2">
            Podés volver a analizarte a partir del{' '}
            <span className="text-white font-medium">{proximaFecha ? formatDate(proximaFecha.toISOString()) : ''}</span>.
          </p>
          <p className="text-[12px] text-[#8A8A8A]">
            Mientras tanto podés revisar tu último resultado en el historial, más abajo.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6">
        {puedeCargarImagen ? (
          <ImageUpload
            variant="box"
            onFileSelect={handleFileSelect}
            capture="user"
            helperText="Subí una foto de frente, con buena luz, sin lentes de sol ni nada que tape tu cara"
          />
        ) : (
          <button
            type="button"
            onClick={handleAddImageClick}
            className="w-full flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[#282828] bg-[#1A1A1A] p-6 cursor-pointer hover:border-[#FF5C00]/50 transition-colors"
          >
            <FiCamera className="w-8 h-8 text-[#8A8A8A] mb-2" />
            <p className="text-[13px] text-[#8A8A8A]">Agregar imagen</p>
            <p className="text-[11px] text-[#555] mt-1">Te vamos a pedir tu consentimiento antes de subirla</p>
          </button>
        )}
        <div className="mt-4 flex justify-center">
          <Button onClick={handleAnalyzeClick} disabled={!file} icon={FiCamera}>
            Analizar foto
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#FF5C00]/10 mb-4">
              <FiCamera className="text-[#FF5C00] text-3xl" />
            </div>
            <h1 className="text-[20px] font-bold text-white">Recomendación de corte con IA</h1>
            <p className="text-[13px] text-[#8A8A8A] mt-1">Subí una foto y recibí una recomendación personalizada</p>
          </div>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          {renderMainPanel()}
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" delay={0.2} className="mt-6">
          <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[15px] font-semibold text-white mb-4">Historial</h3>
            {isLoadingHistorial ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : historial.length === 0 ? (
              <p className="text-[13px] text-[#8A8A8A]">Todavía no hiciste ningún análisis.</p>
            ) : (
              <div className="space-y-3">
                {historial.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDetalleSeleccionado(item)}
                    className="w-full text-left rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3 hover:border-[#FF5C00]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="min-w-0 flex-1 truncate text-[13px] text-white font-medium capitalize">
                        {item.resultado.formaCara}
                      </p>
                      <span className="shrink-0 text-[11px] text-[#8A8A8A]">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="text-[12px] text-[#8A8A8A]">
                      {item.resultado.cortesRecomendados.map((c) => c.nombreCorte).join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </AnimatedContainer>
      </div>

      <ConsentModal
        isOpen={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={handleConsentAccept}
        loading={isAnalyzing}
      />

      <HistorialDetalleModal record={detalleSeleccionado} onClose={() => setDetalleSeleccionado(null)} />
    </div>
  );
}
