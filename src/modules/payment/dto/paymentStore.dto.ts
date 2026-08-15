import {
  IsDecimal,
  IsDefined,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Decimal } from 'generated/prisma/runtime/client';

export class PaymentStoreDto {
  @IsDefined()
  @IsString()
  userId: string;

  @IsDefined()
  @IsDecimal({ decimal_digits: '0,2' })
  amount: Decimal;

  @IsDefined()
  @IsString()
  @Matches(/^INV-\d{8}-\d{6}$/, {
    message: 'Invoice number must have the format INV-YYYYMMDD-NNNNNN',
  })
  reference: string;

  @IsDefined()
  @IsUUID()
  idempotencyKey: string;

  @IsDefined()
  @IsString()
  description: string;
}
