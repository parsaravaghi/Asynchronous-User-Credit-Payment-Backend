import { IsDefined, IsEmail, IsString } from 'class-validator';

export class UserStoreDto {
  @IsDefined()
  @IsString()
  username: string;

  @IsDefined()
  @IsString()
  @IsEmail({})
  email: string;
}
