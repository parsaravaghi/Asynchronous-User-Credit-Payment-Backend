import { IsDefined, IsIn, IsString } from 'class-validator';

export class TimePeriod {
  @IsString()
  @IsDefined()
  @IsIn(['day', 'month', 'year'])
  period: string;
}
