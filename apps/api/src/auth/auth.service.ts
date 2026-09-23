import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { CurrentUser, JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return null;
    }
    return user;
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    };
    const refresh = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken: await this.jwtService.signAsync(
        { ...payload, jti: refresh.id },
        { expiresIn: '7d' },
      ),
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh con rotación: el token usado se revoca y se emite un par nuevo.
   * Reutilizar un refresh revocado responde 401 (posible robo de token).
   */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (!payload.jti) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario ya no existe');
    }
    // Rotación: revocar el usado y emitir uno nuevo (transacción)
    const next = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    // Limpieza oportunista de expirados del usuario
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });
    const nextPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    };
    return {
      accessToken: await this.jwtService.signAsync(nextPayload),
      refreshToken: await this.jwtService.signAsync(
        { ...nextPayload, jti: next.id },
        { expiresIn: '7d' },
      ),
    };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
      if (payload.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { id: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Logout idempotente: token inválido = nada que revocar
    }
    return { success: true };
  }

  async register(dto: RegisterDto, currentUser: CurrentUser) {
    // Matriz de creación:
    // SUPERADMIN -> cualquier rol (hotelId requerido salvo SUPERADMIN)
    // ADMIN_HOTEL -> solo RECEPCION, LIMPIEZA, CLIENTE y solo de su hotel
    if (currentUser.role === Role.ADMIN_HOTEL) {
      if (dto.role === Role.SUPERADMIN || dto.role === Role.ADMIN_HOTEL) {
        throw new ForbiddenException(
          'ADMIN_HOTEL solo puede crear usuarios RECEPCION, LIMPIEZA o CLIENTE',
        );
      }
      if (dto.hotelId && dto.hotelId !== currentUser.hotelId) {
        throw new ForbiddenException(
          'ADMIN_HOTEL solo puede crear usuarios para su propio hotel',
        );
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const hotelId = dto.hotelId ?? currentUser.hotelId ?? null;
    if (dto.role !== Role.SUPERADMIN && !hotelId) {
      throw new ForbiddenException('Se requiere hotelId para roles distintos a SUPERADMIN');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        role: dto.role,
        hotelId,
      },
    });

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    };
  }
}
