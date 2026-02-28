import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatGateway],
})
export class ChatModule {}
