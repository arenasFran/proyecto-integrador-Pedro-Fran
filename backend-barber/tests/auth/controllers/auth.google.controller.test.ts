import jwt from "jsonwebtoken";

import { googleLogin } from "../../../src/auth/controllers/auth.google.controller";
import * as usersService from "../../../src/auth/services/users.services";
import { RegisteredClient } from "../../../src/auth/models/user.model";
import { createMockReq, createMockRes } from "../../test-utils/expressMocks";

// Mock google-auth-library at module import time (controller constructs client immediately)
jest.mock("google-auth-library", () => {
  const verifyIdTokenMock = jest.fn();
  (globalThis as any).__verifyIdTokenMock = verifyIdTokenMock;
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: verifyIdTokenMock,
    })),
  };
});

jest.mock("../../../src/auth/services/users.services", () => ({
  __esModule: true,
  findUserByEmail: jest.fn(),
}));

jest.mock("../../../src/auth/models/user.model", () => ({
  __esModule: true,
  RegisteredClient: { create: jest.fn() },
}));

describe("auth.google.controller", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
  });

  it("200 login: usuario existente permitido", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue({
      _id: "id1",
      email: "user@example.com",
      kind: "Registrado",
      authProvider: "google",
      googleId: "sub-1",
    });

    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "USER@EXAMPLE.COM",
        email_verified: true,
        sub: "sub-1",
      }),
    });

    jest.spyOn(jwt, "sign").mockReturnValue("jwt-token" as any);

    const req = createMockReq({ token: "google-id-token" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(usersService.findUserByEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(RegisteredClient.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Login exitoso",
      token: "jwt-token",
    });
  });

  it("200 register: crea usuario si no existe", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue(null);

    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "new@example.com",
        email_verified: true,
        given_name: "New",
        family_name: "User",
        sub: "sub-new",
      }),
    });

    (RegisteredClient.create as jest.Mock).mockResolvedValue({
      _id: "id2",
      email: "new@example.com",
      kind: "Registrado",
    });

    jest.spyOn(jwt, "sign").mockReturnValue("jwt-token" as any);

    const req = createMockReq({ token: "google-id-token" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(RegisteredClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        name: "New",
        lastname: "User",
        authProvider: "google",
        googleId: "sub-new",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("401 si cuenta no verificada (email_verified false)", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue(null);
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "x@y.com",
        email_verified: false,
        sub: "sub",
      }),
    });

    const req = createMockReq({ token: "t" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Cuenta de Google no verificada",
    });
  });

  it("401 si usuario es Admin/Empleado", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue({
      kind: "Admin",
    });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "admin@example.com",
        email_verified: true,
        sub: "sub",
      }),
    });

    const req = createMockReq({ token: "t" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Este usuario no puede iniciar con Google.",
    });
  });

  it("401 si usuario es Empleado", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue({
      kind: "Empleado",
    });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "emp@example.com",
        email_verified: true,
        sub: "sub",
      }),
    });

    const req = createMockReq({ token: "t" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Este usuario no puede iniciar con Google.",
    });
  });

  it("401 si googleId no matchea para usuario google", async () => {
    const verifyIdTokenMock = (globalThis as any)
      .__verifyIdTokenMock as jest.Mock;

    (usersService.findUserByEmail as jest.Mock).mockResolvedValue({
      kind: "Registrado",
      authProvider: "google",
      googleId: "sub-expected",
    });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "user@example.com",
        email_verified: true,
        sub: "sub-other",
      }),
    });

    const req = createMockReq({ token: "t" });
    const res = createMockRes();

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token de Google inválido",
    });
  });
});
