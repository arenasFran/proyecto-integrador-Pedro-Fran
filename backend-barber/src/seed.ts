import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { Admin } from './auth/models/user.model'

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI as string)

  const existing = await Admin.findOne({ email: 'admin@barberia.com' })
  if (existing) {
    console.log('Admin ya existe')
    process.exit(0)
  }

  const hash = await bcrypt.hash('Admin1234', 10)
  await Admin.create({
    email: 'luffyarenas@gmail.com',
    password: hash,
    name: 'Santiago',
    lastname: 'Abbona',
    phone: '099000000',
    role: 'admin'
  })

  console.log('Admin creado con éxito')
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})