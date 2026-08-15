import { IsDecimal, IsDefined } from 'class-validator';
import { Decimal } from 'generated/prisma/runtime/client';

export class UserCreditDto {
  @IsDefined()
  @IsDecimal({ decimal_digits: '0,2' })
  amount: Decimal;
}
