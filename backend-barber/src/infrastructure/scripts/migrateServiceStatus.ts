import ServiceModel from '../repositories/mongodb/models/service.model';

export const migrateServiceStatus = async () => {
  const result = await ServiceModel.updateMany(
    { status: { $exists: false } },
    [
      {
        $set: {
          status: {
            $cond: {
              if: { $eq: ['$isDeleted', true] },
              then: 'inactive',
              else: {
                $cond: {
                  if: { $eq: ['$isActive', false] },
                  then: 'inactive',
                  else: 'active',
                },
              },
            },
          },
        },
      },
    ]
  );
  console.log(`Migración completada: ${result.modifiedCount} documentos actualizados`);
};
