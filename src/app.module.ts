import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from 'src/database/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis, { Keyv } from '@keyv/redis';
import { KeyvCacheableMemory } from 'cacheable';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    PaymentModule,
    AdminModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        return {
          ttl: 50000,
          stores: [
            new Keyv({
              store: new KeyvCacheableMemory({ ttl: 50000, lruSize: 5000 }),
            }),
            new KeyvRedis(`redis://${process.env.APP_REDIS_HOST}:6379`),
          ],
        };
      },
    }),
  ],
})
export class AppModule {}
