import { BadRequestException, Body, Controller, Get, HttpException, Inject, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, ValidationPipe } from "@nestjs/common";
import UserService from "./auth.service";
import { RegisterBodyDto, LoginBodyDto } from "./auth.dto";
import { ConfigService } from "@nestjs/config";
import {Request, Response} from 'express';
import { AuthGuardCustom, UserDecorator } from "./auth.guard";

@Controller('auth')
export class UserController {
  constructor(
    @Inject()
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {}

  @Post('login')
  async login(
    @Body(new ValidationPipe()) body: LoginBodyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = body;
    const {accessToken, refreshToken} = await this.userService.signIn(email, password);
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

  @Post('logout')
  async logout(@Body() body: any) {
  }

  @Post('register')
  async register(@Body(new ValidationPipe()) body: RegisterBodyDto) {
    return this.userService.register(body)
  }

  @Get('refresh-token')
  async refreshToken(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    const refreshToken = req.cookies?.['accessToken'];
    if (!refreshToken) throw new BadRequestException('refreshToken required!')

    const { accessToken, refreshToken: newRefreshToken } = await this.userService.refreshToken(refreshToken);
    res.cookie('refreshToken', newRefreshToken, {
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

  @Get('info')
  @UseGuards(AuthGuardCustom)
  async getInfo(@UserDecorator() user: any) {
    return user
  }
}
