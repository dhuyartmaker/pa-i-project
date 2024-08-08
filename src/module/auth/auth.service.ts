import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserModel } from './auth.model';
import { FindOptions, Optional } from 'sequelize';
import * as bcrypt from 'bcrypt'
import { RegisterBodyDto } from './auth.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
class UserService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: typeof UserModel,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async findOne(findOption: FindOptions) {
    return this.userRepository.findOne(findOption)
  }

  public async findAll(findOption: FindOptions) {
    return this.userRepository.findAll(findOption)
  }

  public async create(values: Optional<any, string>) {
    return this.userRepository.create(values)
  }

  public async createTokenPair(userPayload: Record<string,any>) {
    const accessToken = this.jwtService.sign({ ...userPayload }, {
      secret: this.configService.get('JWT_KEY'),
      expiresIn: `${this.configService.get('JWT_EXPIRE')}`
    });

    const refreshToken = this.jwtService.sign({ ...userPayload }, {
      secret: this.configService.get('JWT_REFRESH_KEY'),
      expiresIn: `${this.configService.get('JWT_REFRESH_EXPIRE')}`
    });

    return { accessToken, refreshToken }
  }

  public async signIn(email: string, password: string) {
    const holdUser = await this.userRepository.findOne({ where: { email }});
    if (!holdUser) {
      throw new HttpException('Email or password is incorrect!', HttpStatus.UNAUTHORIZED);
    }

    const isValid = await bcrypt.compare(password, holdUser.dataValues.password);

    if (!isValid) {
      throw new HttpException('Email or password is incorrect!', HttpStatus.UNAUTHORIZED);
    }

    const userPayload = {
      id: holdUser.dataValues.id,
      email,
      moreInfo: '.............'
    }
    const { accessToken, refreshToken } = await this.createTokenPair(userPayload);
    await holdUser.update({ refreshToken: await this.hashRefreshToken(refreshToken, 10) });

    return {accessToken, refreshToken}
  }

  public async register(body: typeof RegisterBodyDto.prototype) {
    const existsEmail = await this.findOne({ where: { email: body.email }});
    if (existsEmail) {
      throw new HttpException('Email is existed!', HttpStatus.BAD_REQUEST)
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    const newUser = {
      email: body.email,
      password: hashedPassword,
    };

    const holdUser = await this.userRepository.create(newUser);
    return holdUser;
  }

  public async refreshToken(refreshToken: string) {
    const decodeToken = this.jwtService.decode(refreshToken);
    const userId = decodeToken.id;
    if (!userId) throw new UnauthorizedException('User not found!')

    const userFromDB = await this.userRepository.findOne({
      where: { id: userId },
      attributes: ['id', 'email', 'refreshToken']
    });
    if (!userFromDB) throw new UnauthorizedException('User not found!')

    const compareToken = await bcrypt.compare(refreshToken, userFromDB.dataValues.refreshToken)
    if (!compareToken) throw new UnauthorizedException('Token fail!')

    const userPayload = {
      id: userFromDB.dataValues.id,
      email: userFromDB.dataValues.email,
      moreInfo: '.............'
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.createTokenPair(userPayload);
    await userFromDB.update({ refreshToken:  newRefreshToken })

    return {
      accessToken,
      refreshToken: newRefreshToken
    }
  }

  public async hashRefreshToken (
    refreshToken: string,
    saltNumber: number,
  ) {
    const salt = await bcrypt.genSalt(saltNumber);
    const refeshTokenHashed = await bcrypt.hash(refreshToken, salt)
    return refeshTokenHashed;
  };
}

export default UserService;
