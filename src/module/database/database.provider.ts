import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import { Provider } from '@nestjs/common';
import { UserModel } from '../auth/auth.model';

dotenv.config();

export const databaseProvider: Provider<any>[] = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT as any,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        logging: process.env.NODE_ENV === 'production' ? false : true
      });

      sequelize.addModels([
        UserModel
      ])
      await sequelize.sync();
      return sequelize;
    },
  },
];
