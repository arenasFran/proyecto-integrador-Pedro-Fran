import ServiceModel from '../repositories/mongodb/models/service.model';

const SERVICES_SEED = [
  { name: 'Corte de pelo', description: 'Incluye barba/cejas/lavado/bebida a elección', price: 490, imageUrl: 'https://placehold.co/400x300?text=Corte+de+pelo', status: 'active' },
  { name: 'Corte a máquina', description: 'Un solo número en toda la cabeza, incluye bebida a elección', price: 350, imageUrl: 'https://placehold.co/400x300?text=Corte+a+m%C3%A1quina', status: 'active' },
  { name: 'Barba', description: 'Incluye bebida a elección', price: 250, imageUrl: 'https://placehold.co/400x300?text=Barba', status: 'active' },
];

export const seedServices = async () => {
  for (const svc of SERVICES_SEED) {
    await ServiceModel.findOneAndUpdate(
      { name: svc.name },
      { $setOnInsert: svc },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log('Servicios seeded correctamente');
};
