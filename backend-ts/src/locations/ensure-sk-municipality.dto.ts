import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnsureSkMunicipalityDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
