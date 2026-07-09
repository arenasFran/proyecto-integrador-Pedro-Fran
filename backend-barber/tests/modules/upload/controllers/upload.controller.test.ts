import { UploadController } from '../../../../src/interface-adapters/controllers/upload/UploadController';
import { createMockRes } from '../../../test-utils/expressMocks';
import { makeMockUserRepository } from '../../../test-utils/mocks';

describe('UploadController', () => {
  let cloudinary: { uploadImage: jest.Mock; deleteImage: jest.Mock };
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let controller: UploadController;

  const makeReq = (overrides: Record<string, any> = {}) =>
    ({
      file: { buffer: Buffer.from('fake-image') },
      body: {},
      user: { _id: 'user-1', email: 'user@example.com', kind: 'Registrado' },
      ...overrides,
    }) as any;

  beforeEach(() => {
    cloudinary = {
      uploadImage: jest.fn().mockResolvedValue('https://cloudinary.example/v1/avatars/new.jpg'),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };
    userRepository = makeMockUserRepository();
    controller = new UploadController(cloudinary as any, userRepository as any);
  });

  it('debe subir la imagen y responder 201 con la nueva URL', async () => {
    const req = makeReq();
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(cloudinary.uploadImage).toHaveBeenCalledWith(req.file.buffer);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ photoUrl: 'https://cloudinary.example/v1/avatars/new.jpg' });
  });

  it('debe borrar la foto vieja cuando es la propia foto del usuario autenticado', async () => {
    const oldPhotoUrl = 'https://cloudinary.example/v1/avatars/old.jpg';
    userRepository.findById.mockResolvedValue({ id: 'user-1', photoUrl: oldPhotoUrl } as any);
    const req = makeReq({ body: { oldPhotoUrl } });
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('avatars/old');
  });

  it('debe borrar la foto de un barbero cuando quien sube es Admin (gestión de profesionales)', async () => {
    const barberPhotoUrl = 'https://cloudinary.example/v1/avatars/barber.jpg';
    const req = makeReq({
      body: { oldPhotoUrl: barberPhotoUrl },
      user: { _id: 'admin-1', email: 'admin@example.com', kind: 'Admin' },
    });
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('avatars/barber');
  });

  it('NO debe borrar la foto de otro usuario (IDOR) si quien sube no es dueño ni Admin', async () => {
    const someoneElsesPhotoUrl = 'https://cloudinary.example/v1/avatars/other-user.jpg';
    userRepository.findById.mockResolvedValue({ id: 'user-1', photoUrl: 'https://cloudinary.example/v1/avatars/my-own.jpg' } as any);
    const req = makeReq({ body: { oldPhotoUrl: someoneElsesPhotoUrl } });
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(cloudinary.deleteImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('no debe intentar borrar la foto vieja si la subida de la nueva falla', async () => {
    cloudinary.uploadImage.mockRejectedValue(new Error('Cloudinary caído'));
    const req = makeReq({ body: { oldPhotoUrl: 'https://cloudinary.example/v1/avatars/old.jpg' } });
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(cloudinary.deleteImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('debe fallar con 400 si no se envió ninguna imagen', async () => {
    const req = makeReq({ file: undefined });
    const res = createMockRes();

    await controller.uploadAvatar(req, res);

    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
