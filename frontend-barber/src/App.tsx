import { motion } from "framer-motion";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center ">
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Frontend <span className="text-sky-800">Configurado</span>
        </h1>
        <p className="text-zinc-400">Vite + React + TS + Tailwind + Framer</p>
      </motion.div>
    </div>
  );
}

export default App;