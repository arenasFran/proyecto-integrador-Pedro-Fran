import mongoose from 'mongoose';
import { Client } from '../../domain/entities/Client';

export class ClientMapper {
  static fromDocument(doc: Record<string, any>): Client {
    return Client.create({
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      name: doc.name || '',
      lastname: doc.lastname || '',
      phone: doc.phone,
      contactEmail: doc.contactEmail,
      kind: doc.kind || 'NoRegistrado',
    });
  }
}