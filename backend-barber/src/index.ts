import 'dotenv/config';

import app from "./app";
import { connectDB } from "./infrastructure/config/db";
import { seedAdmin, seedBarbers } from "./infrastructure/scripts/seed";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedBarbers();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
};

startServer();