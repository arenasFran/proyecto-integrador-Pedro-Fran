import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { AnimatedContainer, Spinner } from '../../../components/common';
import api, { getAccessToken } from '../../../services/api';
import { useGetCalendarAppointmentsQuery } from '../../../services/appointmentApi';
import type { Appointment, BarberBlock } from '../../../types/booking';
import { getTokenUser } from '../../../utils/token';
import { AppointmentActionModals } from '../AppointmentsPage/AppointmentActionModals';
import { useAppointmentActions } from '../AppointmentsPage/useAppointmentActions';
import { BlockModal } from './BlockModal';
import { DayCard } from './DayCard';
import { DayDetailModal } from './DayDetailModal';
import { QuickCreateModal } from './QuickCreateModal';
import AdminPageHeader from '../components/AdminPageHeader';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAY_ABBR = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const DAYS_TO_SHOW = 14;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function mondayDow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateRange(days: Date[]): string {
  const from = days[0];
  const to = days[days.length - 1];
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()} - ${to.getDate()} de ${MONTHS[from.getMonth()]}`;
  }
  const fromLabel = `${from.getDate()} de ${MONTHS[from.getMonth()]}`;
  const toLabel = `${to.getDate()} de ${MONTHS[to.getMonth()]}`;
  return `${fromLabel} - ${toLabel}`;
}

interface DayColumn {
  date: Date;
  dateStr: string;
  dayApps: Appointment[];
}

export const CalendarPage: React.FC = () => {
  const [startDate, setStartDate] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [blockingDate, setBlockingDate] = useState<string | null>(null);
  const [blocksByDate, setBlocksByDate] = useState<Map<string, BarberBlock[]>>(new Map());
  const [blocksRefreshKey, setBlocksRefreshKey] = useState(0);

  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(
    () => Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i)),
    [startDate],
  );

  const dateFrom = toISODate(days[0]);
  const dateTo = toISODate(days[days.length - 1]);

  const tokenUser = getTokenUser(getAccessToken());
  const employeeBarberId = tokenUser?.kind === 'Empleado' ? tokenUser.id : undefined;

  const { data: appointments = [], isLoading } = useGetCalendarAppointmentsQuery({
    dateFrom,
    dateTo,
    includeBarber: 'true',
    includeClient: 'true',
    ...(employeeBarberId ? { barberId: employeeBarberId } : {}),
  });

  const appointmentActions = useAppointmentActions();

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const existing = map.get(a.date) ?? [];
      existing.push(a);
      map.set(a.date, existing);
    }
    for (const apps of map.values()) {
      apps.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [appointments]);

  const selectedAppointments = selectedDate ? appointmentsByDate.get(selectedDate) ?? [] : [];
  const selectedBlocks = selectedDate ? blocksByDate.get(selectedDate) ?? [] : [];

  useEffect(() => {
    let cancelled = false;
    const fetchBlocks = async () => {
      try {
        const response = await api.get<{ blocks: BarberBlock[] }>('/api/barbers/blocks', {
          params: { dateFrom, dateTo },
        });
        if (cancelled) return;
        const blocks = employeeBarberId
          ? response.data.blocks.filter((b) => b.barberId === employeeBarberId)
          : response.data.blocks;
        const map = new Map<string, BarberBlock[]>();
        for (const block of blocks) {
          const existing = map.get(block.date) ?? [];
          existing.push(block);
          map.set(block.date, existing);
        }
        setBlocksByDate(map);
      } catch {
        // ignore fetch errors
      }
    };
    fetchBlocks();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, employeeBarberId, blocksRefreshKey]);

  const goPrev = useCallback(() => {
    setStartDate(prev => addDays(prev, -DAYS_TO_SHOW));
    setSelectedDate(null);
  }, []);

  const goNext = useCallback(() => {
    setStartDate(prev => addDays(prev, DAYS_TO_SHOW));
    setSelectedDate(null);
  }, []);

  const goToday = useCallback(() => {
    setStartDate(getMonday(startOfDay(new Date())));
    setSelectedDate(null);
  }, []);

  const columns = useMemo<DayColumn[]>(
    () =>
      days.map((d) => ({
        date: d,
        dateStr: toISODate(d),
        dayApps: appointmentsByDate.get(toISODate(d)) ?? [],
      })),
    [days, appointmentsByDate],
  );

  const gridRows = useMemo(() => {
    const rows: (DayColumn | null)[][] = [];
    let currentRow: (DayColumn | null)[] = [null, null, null, null, null, null, null];

    for (const col of columns) {
      const dow = mondayDow(col.date);
      if (currentRow[dow] !== null) {
        rows.push(currentRow);
        currentRow = [null, null, null, null, null, null, null];
      }
      currentRow[dow] = col;
    }

    if (currentRow.some((c) => c !== null)) {
      rows.push(currentRow);
    }

    return rows;
  }, [columns]);

  return (
    <div className="w-full bg-[#050505] text-white lg:h-[calc(100vh-2rem)] xl:h-[calc(100vh-2.5rem)] 2xl:h-auto">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 lg:h-full lg:min-h-0 2xl:h-auto 2xl:gap-6">
        <AnimatedContainer animation="fadeInDown" className="shrink-0">
          <AdminPageHeader compact icon={FiCalendar} title="Calendario" description="Organizá la agenda y creá turnos desde una vista única." />
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="flex flex-col rounded-[14px] border border-[#282828] bg-[#121212] p-3 lg:min-h-0 lg:flex-1 2xl:flex-none 2xl:rounded-[16px] 2xl:p-4">
          <div className="flex shrink-0 flex-col gap-2 2xl:gap-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2 2xl:gap-3">
                <button
                  onClick={goPrev}
                  className="flex items-center justify-center rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-1.5 text-[#8A8A8A] hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors 2xl:p-2"
                  aria-label="Anterior"
                >
                  <FiChevronLeft className="text-base" />
                </button>
                <button
                  onClick={goToday}
                  className="hidden sm:inline-flex items-center justify-center rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-2.5 py-1.5 text-[12px] text-[#8A8A8A] hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors 2xl:px-3 2xl:py-2 2xl:text-[13px]"
                >
                  Hoy
                </button>
                <span className="whitespace-nowrap text-[13px] font-medium text-white 2xl:text-[14px]">
                  {formatDateRange(days)}
                </span>
                <button
                  onClick={goNext}
                  className="flex items-center justify-center rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-1.5 text-[#8A8A8A] hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors 2xl:p-2"
                  aria-label="Siguiente"
                >
                  <FiChevronRight className="text-base" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="mt-3 hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col 2xl:mt-6 2xl:block 2xl:flex-none">
                <div className="mb-2 grid shrink-0 grid-cols-7 gap-2 2xl:mb-4 2xl:gap-4">
                  {WEEKDAY_ABBR.map((abbr) => (
                    <div key={abbr} className="text-center text-[11px] font-bold uppercase tracking-wider text-[#505050] 2xl:text-[13px]">
                      {abbr}
                    </div>
                  ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 2xl:flex-none 2xl:overflow-visible 2xl:pr-0">
                  <div
                    className="grid h-full grid-cols-7 gap-2 2xl:h-auto 2xl:gap-4"
                    style={{ gridTemplateRows: `repeat(${gridRows.length}, minmax(148px, 1fr))` }}
                  >
                    {gridRows.flatMap((row, rowIndex) =>
                      row.map((col, colIndex) => {
                        if (!col) {
                          return <div key={`empty-${rowIndex}-${colIndex}`} />;
                        }
                        return (
                          <DayCard
                            key={col.dateStr}
                            date={col.date}
                            appointments={col.dayApps}
                            blocks={blocksByDate.get(col.dateStr) ?? []}
                            isToday={isSameDay(col.date, today)}
                            onShowMore={() => setSelectedDate(col.dateStr)}
                            onCreateTurno={() => setCreatingDate(col.dateStr)}
                            onCreateBlock={() => setBlockingDate(col.dateStr)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

               <div className="mt-3 grid gap-3 md:grid-cols-2 lg:hidden">
                {columns.map((col) => (
                  <DayCard
                    key={col.dateStr}
                    date={col.date}
                    appointments={col.dayApps}
                    blocks={blocksByDate.get(col.dateStr) ?? []}
                    isToday={isSameDay(col.date, today)}
                    onShowMore={() => setSelectedDate(col.dateStr)}
                    onCreateTurno={() => setCreatingDate(col.dateStr)}
                    onCreateBlock={() => setBlockingDate(col.dateStr)}
                  />
                ))}
              </div>
            </>
          )}
        </AnimatedContainer>
      </div>

      <DayDetailModal
        isOpen={selectedDate !== null}
        date={selectedDate ?? ''}
        appointments={selectedAppointments}
        blocks={selectedBlocks}
        onClose={() => setSelectedDate(null)}
        onBlockDeleted={() => setBlocksRefreshKey(k => k + 1)}
        actions={appointmentActions}
      />

      <AppointmentActionModals {...appointmentActions} />

      {creatingDate && (
        <QuickCreateModal
          key={creatingDate}
          dateStr={creatingDate}
          onClose={() => setCreatingDate(null)}
        />
      )}

      {blockingDate && (
        <BlockModal
          key={blockingDate}
          dateStr={blockingDate}
          onClose={() => setBlockingDate(null)}
          onBlockCreated={(block) => {
            setBlocksByDate((prev) => {
              const next = new Map(prev);
              const existing = next.get(block.date) ?? [];
              existing.push(block);
              next.set(block.date, existing);
              return next;
            });
          }}
        />
      )}
    </div>
  );
};

export default CalendarPage;
