import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      const name = (info as { name?: string } | undefined)?.name;
      if (name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }
      if (name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido');
      }
      throw err || new UnauthorizedException('No autenticado');
    }
    return user as TUser;
  }
}
