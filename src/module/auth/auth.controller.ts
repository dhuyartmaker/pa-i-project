import { Body, Controller, Get, HttpException, Inject, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, ValidationPipe } from "@nestjs/common";
import UserService from "./auth.service";
import { RegisterBodyDto, LoginBodyDto } from "./auth.dto";
import { ConfigService } from "@nestjs/config";
import {Response} from 'express';
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
    return { accessToken, refreshToken };
  }

  @Post('logout')
  async logout(@Body() body: any) {
  }

  @Post('register')
  async register(@Body(new ValidationPipe()) body: RegisterBodyDto) {
    return this.userService.register(body)
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: any) {
  }

  @Get('info')
  @UseGuards(AuthGuardCustom)
  async getInfo(@UserDecorator() user: any) {
    return user
  }
}
