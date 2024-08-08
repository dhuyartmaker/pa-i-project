import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import UserService from '../auth/auth.service';

@Injectable()
export class GoogleService {
  constructor(
    private readonly userService: UserService,
  ){}

  async googleLogin(req) {
    if (!req.user) {
      throw new HttpException('Login google fail!', HttpStatus.UNAUTHORIZED);
    }

    const userInfo = req.user;
    const findUser = await this.userService.findOne({ where: { email: userInfo.email }})
    if (!findUser) {

      const newUser = {
        email: userInfo.email,
        password: "",
      };
      
      const holdUser = await this.userService.create(newUser);
      const userPayload = {
        id: holdUser.dataValues.id,
        email: userInfo.email,
        moreInfo: '.............'
      }
      const { accessToken, refreshToken } = await this.userService.createTokenPair(userPayload);
      await holdUser.update({ refreshToken: await this.userService.hashRefreshToken(refreshToken, 10) });
      return {accessToken, refreshToken}
    } else {
      const userPayload = {
        id: findUser.dataValues.id,
        email: userInfo.email,
        moreInfo: '.............'
      }
      const { accessToken, refreshToken } = await this.userService.createTokenPair(userPayload);
      await findUser.update({ refreshToken: await this.userService.hashRefreshToken(refreshToken, 10) });
      return {accessToken, refreshToken}
    }
  }
}