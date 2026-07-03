import React, { useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Spinner } from '../../../components/common';
import { useGetAppointmentsQuery } from '../../../services/appointmentApi';
import { getAccessToken } from '../../../services/api';
import { DayCard } from './DayCard';
import { DayDetailModal } from './DayDetailModal';
import { BlockModal } from './BlockModal';
import { QuickCreateModal } from './QuickCreateModal';
import type { Appointment, BarberBlock } from '../../../types/booking';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAY_ABBR = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const DAYS_TO_SHOW = 14;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

  const { data: appointments = [], isLoading } = useGetAppointmentsQuery({
    dateFrom,
    dateTo,
    limit: 100,
    includeBarber: 'true',
  });

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
    const fetchBlocks = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/barbers/blocks?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const map = new Map<string, BarberBlock[]>();
          for (const block of data.blocks as BarberBlock[]) {
            const existing = map.get(block.date) ?? [];
            existing.push(block);
            map.set(block.date, existing);
          }
          setBlocksByDate(map);
        }
      } catch {
        // ignore fetch errors
      }
    };
    fetchBlocks();
  }, [dateFrom, dateTo, blocksRefreshKey]);

  const goPrev = () => {
    setStartDate(addDays(startDate, -DAYS_TO_SHOW));
    setSelectedDate(null);
  };

  const goNext = () => {
    setStartDate(addDays(startDate, DAYS_TO_SHOW));
    setSelectedDate(null);
  };

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
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A] w-fit">
              <FiScissors className="text-[#FF5C00]" />
              Calendario de turnos
            </div>

            <div className="flex items-center justify-between">
              <h1 className="hidden sm:block text-[28px] font-extrabold tracking-[-0.02em] text-white">
                Calendario
              </h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={goPrev}
                  className="flex items-center justify-center rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-2 text-[#8A8A8A] hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors"
                  aria-label="Anterior"
                >
                  <FiChevronLeft className="text-base" />
                </button>
                <span className="text-[14px] font-medium text-white whitespace-nowrap">
                  {formatDateRange(days)}
                </span>
                <button
                  onClick={goNext}
                  className="flex items-center justify-center rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-2 text-[#8A8A8A] hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors"
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
              <div className="hidden lg:block mt-6">
                <div className="grid grid-cols-7 gap-4 mb-4">
                  {WEEKDAY_ABBR.map((abbr) => (
                    <div key={abbr} className="text-center text-[13px] font-bold uppercase tracking-wider text-[#505050]">
                      {abbr}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {gridRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-7 gap-4">
                      {row.map((col, colIndex) => {
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
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 lg:hidden">
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
      />

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
