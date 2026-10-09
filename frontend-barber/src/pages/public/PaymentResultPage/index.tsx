import { Link } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiShoppingBag } from 'react-icons/fi';

export default function PaymentResultPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-[#282828] bg-[#121212] p-7 text-center">
        <h1 className="text-xl font-semibold">Los pagos en línea ya no están disponibles</h1>
        <p className="mt-3 text-sm leading-6 text-[#999]">
          Si llegaste desde un pago iniciado anteriormente, consultá el estado de tu reserva u orden. El personal de la barbería puede ayudarte a verificarlo.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/mis-turnos" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#333] px-4 py-3 text-sm hover:border-[#FF5C00]">
            <FiCalendar aria-hidden="true" /> Mis turnos
          </Link>
          <Link to="/mis-ordenes" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-3 text-sm font-medium hover:bg-[#e65300]">
            <FiShoppingBag aria-hidden="true" /> Mis órdenes
          </Link>
        </div>
        <Link to="/" className="mt-5 inline-flex items-center gap-1 text-xs text-[#888] hover:text-white">
          <FiArrowLeft aria-hidden="true" /> Volver al inicio
        </Link>
      </section>
    </main>
  );
}
