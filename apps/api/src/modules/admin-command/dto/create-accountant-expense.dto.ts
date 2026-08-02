import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAccountantExpenseDto {
  @Transform(trim)
  @IsString()
  @IsIn([
    'academics',
    'administration',
    'boarding',
    'maintenance',
    'transport',
    'utilities',
    'other',
  ])
  category!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  description!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[1-9][0-9]*$/, {
    message: 'amount_minor must be a positive whole number of minor currency units',
  })
  amount_minor!: string;
}
