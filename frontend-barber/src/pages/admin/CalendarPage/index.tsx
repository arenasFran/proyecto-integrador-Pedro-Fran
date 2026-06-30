import React, { useMemo, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiScissors } from 'react-icons/fi';
import { AnimatedContainer, Spinner, StatsCards } from '../../../components/common';
import { useGetAppointmentsQuery } from '../../../services/appointmentApi';
import { CompactDayCard } from './CompactDayCard';
import { DayCard } from './DayCard';
import { DayDetailModal } from './DayDetailModal';
import type { Appointment } from '../../../types/booking';

const DAYS_PER_PAGE = 12;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function formatDateCompact(d: Date): string {
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function generateDays(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const CalendarPage: React.FC = () => {
  const [baseDate, setBaseDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = useMemo(() => generateDays(baseDate, DAYS_PER_PAGE), [baseDate]);
  const dateFrom = toISODate(days[0]);
  const dateTo = toISODate(days[days.length - 1]);

  const { data: appointments = [], isLoading } = useGetAppointmentsQuery({ dateFrom, dateTo });

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const existing = map.get(a.date) ?? [];
      existing.push(a);
      map.set(a.date, existing);
    }
    return map;
  }, [appointments]);

  const selectedAppointments = selectedDate ? appointmentsByDate.get(selectedDate) ?? [] : [];

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments]);

  const goPrev = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - DAYS_PER_PAGE);
    setBaseDate(d);
    setSelectedDate(null);
  };

  const goNext = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + DAYS_PER_PAGE);
    setBaseDate(d);
    setSelectedDate(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
              <div className="flex items-center gap-2 sm:hidden">
                <button onClick={goPrev} className="rounded-[8px] border border-[#282828] p-2 text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors">
                  <FiChevronLeft className="text-sm" />
                </button>
                <span className="text-[14px] font-medium text-white whitespace-nowrap">
                  {formatDateCompact(days[0])} — {formatDateCompact(days[days.length - 1])}
                </span>
                <button onClick={goNext} className="rounded-[8px] border border-[#282828] p-2 text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors">
                  <FiChevronRight className="text-sm" />
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={goPrev} className="flex items-center gap-1 rounded-[8px] border border-[#282828] px-3 py-1.5 text-[13px] text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors">
                  <FiChevronLeft /> Anterior
                </button>
                <span className="text-[14px] text-[#8A8A8A] px-2">
                  {formatDateCompact(days[0])} — {formatDateCompact(days[days.length - 1])}
                </span>
                <button onClick={goNext} className="flex items-center gap-1 rounded-[8px] border border-[#282828] px-3 py-1.5 text-[13px] text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors">
                  Siguiente <FiChevronRight />
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
              <div className="mt-6 grid grid-cols-4 gap-2 sm:hidden">
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const dayApps = appointmentsByDate.get(dateStr) ?? [];
                  return (
                    <CompactDayCard
                      key={dateStr}
                      day={d.getDate()}
                      month={MONTHS[d.getMonth()]}
                      isToday={isSameDay(d, today)}
                      hasAppointments={dayApps.length > 0}
                      isSelected={selectedDate === dateStr}
                      onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                    />
                  );
                })}
              </div>

              <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
                {days.map((d) => {
                  const dateStr = toISODate(d);
                  const dayApps = appointmentsByDate.get(dateStr) ?? [];
                  return (
                    <DayCard
                      key={dateStr}
                      day={d.getDate()}
                      month={MONTHS[d.getMonth()]}
                      weekday={WEEKDAYS[d.getDay()]}
                      isToday={isSameDay(d, today)}
                      isSelected={selectedDate === dateStr}
                      appointmentCount={dayApps.length}
                      onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                    />
                  );
                })}
              </div>
            </>
          )}

          <div className="sm:hidden">
            <StatsCards stats={stats} compact />
          </div>
          <div className="hidden sm:block">
            <StatsCards stats={stats} />
          </div>
        </AnimatedContainer>
      </div>

      <DayDetailModal
        isOpen={selectedDate !== null}
        date={selectedDate ?? ''}
        appointments={selectedAppointments}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
};

export default CalendarPage;
