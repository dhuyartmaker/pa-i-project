import {
  ExecutionContext,
  Injectable,
  CanActivate,
  Inject,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import UserService from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuardCustom implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest()
      const accessToken = request.cookies?.['accessToken'];
      console.log('==accessToken==', accessToken)
      if (!accessToken) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
      const user = await this.jwtService.verifyAsync(accessToken, {
        secret: this.configService.get('JWT_KEY'),
      });

      if (!user || !user.id) {
        throw new UnauthorizedException()
      }

      request['user'] = user;

      return true;
    } catch (error) {
      throw new HttpException('Unauthorized', 401)
    }
  }
}

export const UserDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);