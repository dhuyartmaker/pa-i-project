import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleService } from './google.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('api')
export class GoogleController {
  constructor(
    private readonly googleService: GoogleService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login-google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('auth/google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    const {accessToken, refreshToken} = await this.googleService.googleLogin(req);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: parseInt(this.configService.get('JWT_REFRESH_EXPIRE').slice(0, -1)) * 24 * 3600 * 1000,
    });
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: parseInt(this.configService.get('JWT_EXPIRE').slice(0, -1)) * 24 * 3600 * 1000,
    });
    return true;
  }
}