import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);

    console.log(`Mongo conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error conectando a Mongo:", error);
    process.exit(1);
  }
};
