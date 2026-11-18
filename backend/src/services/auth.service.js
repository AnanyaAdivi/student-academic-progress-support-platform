import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { signAccessToken } from '../middleware/auth.js';
import { authRepository } from '../repositories/auth.repository.js';

function hashRefreshToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex');
}

function generateRawRefreshToken() {
  return randomBytes(48).toString('hex');
}

export const authService = {
  async login(email, password) {
    const dbUser = await authRepository.findUserByEmail(email);
    if (!dbUser) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, dbUser.password_hash);
    if (!valid) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password.');
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role,
    };

    const accessToken = signAccessToken(user);
    const refreshToken = generateRawRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await authRepository.insertRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId: randomUUID(),
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  },

  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token missing.');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await authRepository.findRefreshTokenByHash(tokenHash);
    if (!existing) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid refresh token.');
    }

    if (existing.revoked_at !== null) {
      await authRepository.revokeRefreshTokenFamily(existing.family_id);
      throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token reuse detected; session revoked.');
    }

    if (existing.expires_at.getTime() <= Date.now()) {
      await authRepository.revokeRefreshTokenById(existing.id);
      throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token expired.');
    }

    await authRepository.revokeRefreshTokenById(existing.id);

    const dbUser = await authRepository.findUserById(existing.user_id);
    if (!dbUser) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User account no longer exists.');
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role,
    };

    const accessToken = signAccessToken(user);
    const newRefreshToken = generateRawRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await authRepository.insertRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(newRefreshToken),
      familyId: existing.family_id,
      expiresAt,
    });

    return { user, accessToken, refreshToken: newRefreshToken };
  },

  async logout(rawRefreshToken) {
    if (!rawRefreshToken) return;
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await authRepository.findRefreshTokenByHash(tokenHash);
    if (existing) {
      await authRepository.revokeRefreshTokenFamily(existing.family_id);
    }
  },

  async getMe(userId) {
    const dbUser = await authRepository.findUserById(userId);
    if (!dbUser) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not found.');
    }
    return {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role,
    };
  },
};