import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnsureSkCvSkillDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;
}
