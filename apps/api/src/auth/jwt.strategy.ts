import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  hotelId: string | null;
  /** Solo presente en refresh tokens: id del registro en RefreshToken */
  jti?: string;
}

export interface CurrentUser {
  userId: string;
  email: string;
  role: Role;
  hotelId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload): CurrentUser {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      hotelId: payload.hotelId,
    };
  }
}
