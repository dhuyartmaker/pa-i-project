import { Module } from '@nestjs/common';
import { UserProviders } from './auth.model';
import { UserController } from './auth.controller';
import UserService from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
    JwtModule
  ],
  controllers: [UserController],
  providers: [...UserProviders, UserService],
  exports: [],
})
export class AuthModule {}
