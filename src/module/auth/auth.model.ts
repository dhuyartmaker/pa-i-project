import {
  Table,
  Column,
  Model,
  AllowNull,
  HasMany,
  DataType
} from 'sequelize-typescript';

@Table({timestamps: true, modelName: 'User', paranoid: true})
export class UserModel extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.INTEGER,
    field: 'id'
  })
  id: number;

  @AllowNull(false)
  @Column
  password: string;

  @Column
  email?: string;

  @Column
  refreshToken?: string;
}

export const UserProviders = [
  {
    provide: 'USER_REPOSITORY',
    useValue: UserModel,
  },
];
