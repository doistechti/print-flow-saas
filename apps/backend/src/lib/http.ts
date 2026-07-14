import type { FastifyRequest } from "fastify";
import type { ApiErrorResponse, SessionTokenPayload } from "@print-flow/contracts";
import { verifySessionToken } from "./session.js";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }

  toResponse(): ApiErrorResponse {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export function parseBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function requireSession(request: FastifyRequest): SessionTokenPayload {
  const token = parseBearerToken(request.headers.authorization);

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Token de acesso ausente");
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    throw new ApiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada");
  }

  return payload;
}
