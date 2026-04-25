import dotenv from "dotenv";
dotenv.config(); 

import app from "./server";     
import { connectDB } from "./config/db";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
};

startServer();