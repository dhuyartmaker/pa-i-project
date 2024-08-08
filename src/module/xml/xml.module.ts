import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { XmlController } from './xml.controller';
import XmlService from './xml.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule
  ],
  controllers: [XmlController],
  providers: [XmlService],
  exports: [],
})
export class XmlModule {}
