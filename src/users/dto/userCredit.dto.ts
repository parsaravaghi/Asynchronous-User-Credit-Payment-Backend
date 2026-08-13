import { IsDefined, IsInt, IsString, Max } from 'class-validator';

export class UserCreditDto {
  @IsDefined()
  @IsInt()
  @Max(100000000)
  amount: number;

  @IsDefined()
  @IsString()
  reference: string;

  @IsDefined()
  @IsString()
  description: string;
}
