import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { Admin } from './auth/models/user.model'

const seed = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'Admin';
  const adminLastname = process.env.SEED_ADMIN_LASTNAME || 'Admin';
  const adminPhone = process.env.SEED_ADMIN_PHONE || '000000000';

  if (!adminEmail || !adminPassword) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are required');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI as string)

  const existing = await Admin.findOne({ email: adminEmail })
  if (existing) {
    console.log('Admin ya existe')
    process.exit(0)
  }

  const hash = await bcrypt.hash(adminPassword, 10)
  await Admin.create({
    email: adminEmail,
    password: hash,
    name: adminName,
    lastname: adminLastname,
    phone: adminPhone,
  })

  console.log('Admin creado con éxito')
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})