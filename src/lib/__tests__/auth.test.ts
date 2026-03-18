// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

import { createSession, getSession, deleteSession, verifySession } from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an auth-token cookie with correct options", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();

  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession produces a valid JWT with userId and email", async () => {
  await createSession("user-456", "alice@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-456");
  expect(payload.email).toBe("alice@example.com");
  expect(payload.exp).toBeDefined();
  expect(payload.iat).toBeDefined();
});

test("getSession returns payload when a valid token exists", async () => {
  const token = await new SignJWT({ userId: "user-789", email: "bob@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-789");
  expect(session!.email).toBe("bob@example.com");
});

test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not-a-valid-jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a token signed with wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "x@x.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(wrongSecret);

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns payload from a valid token on the request", async () => {
  const token = await new SignJWT({ userId: "user-abc", email: "req@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);

  const request = new NextRequest("http://localhost:3000/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-abc");
  expect(session!.email).toBe("req@example.com");
});

test("verifySession returns null when no cookie on request", async () => {
  const request = new NextRequest("http://localhost:3000/");

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token on request", async () => {
  const request = new NextRequest("http://localhost:3000/", {
    headers: { cookie: "auth-token=garbage" },
  });

  const session = await verifySession(request);

  expect(session).toBeNull();
});
