import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './module/database/database.module';
import { AuthModule } from './module/auth/auth.module';
import { XmlModule } from './module/xml/xml.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    XmlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
