import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatContentCryptoService } from './chat-content-crypto.service';
import { ChatMessagesService } from './chat-messages.service';
import { ChatNotificationsService } from './chat-notifications.service';
import { ChatRoomsService } from './chat-rooms.service';

@Module({
  imports: [AuthModule, NotificationsModule, StorageModule],
  controllers: [ChatController],
  providers: [
    ChatContentCryptoService,
    ChatMessagesService,
    ChatNotificationsService,
    ChatGateway,
    ChatRoomsService,
  ],
  exports: [
    ChatMessagesService,
    ChatGateway,
    ChatNotificationsService,
    ChatRoomsService,
  ],
})
export class ChatModule {}
