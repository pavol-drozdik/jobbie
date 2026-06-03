import { Global, Module } from '@nestjs/common';
import { ConsentEventsService } from './consent-events.service';

@Global()
@Module({
  providers: [ConsentEventsService],
  exports: [ConsentEventsService],
})
export class ConsentModule {}
