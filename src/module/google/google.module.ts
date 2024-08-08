import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GoogleService } from './google.service';
import { GoogleController } from './google.controller';
import { GoogleStrategy } from './google.strategy';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    AuthModule
  ],
  controllers: [GoogleController],
  providers: [GoogleService, GoogleStrategy],
  exports: [],
})
export class GoogleModule {}
