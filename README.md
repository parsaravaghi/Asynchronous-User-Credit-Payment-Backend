# API Documentation

A simple REST API for managing users, payments, balances, and admin reports. The project uses NestJS, PostgreSQL, Redis, RabbitMQ, Prisma, and Docker.

## API Routes

### Users

| Method | Route                | Description      |
| ------ | -------------------- | ---------------- |
| POST   | `/users`             | Create user      |
| GET    | `/users/:id/balance` | Get user balance |
| POST   | `/users/:id/credit`  | Add credit       |

### Payments

| Method | Route                | Description    |
| ------ | -------------------- | -------------- |
| POST   | `/payment`           | Create payment |
| POST   | `/payment/:id/retry` | Retry payment  |

### Admin

| Method | Route                          | Description            |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/admin/users`                 | List users             |
| GET    | `/admin/users/:id`             | Get user details       |
| GET    | `/admin/reports/aggregate`     | Get transaction report |
| GET    | `/admin/reports/usage/:userId` | Get user balance usage |

### Examples

```text
GET /admin/users?page=1&limit=20&sort=createdAt&order=desc

GET /admin/reports/aggregate?period=month
```

`period`: `day` | `month` | `year`

## Docker

Start the project:

```bash
docker compose up --build
```

Run in background:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

Check containers:

```bash
docker compose ps
```

Run Prisma migration:

```bash
docker compose exec app npx prisma migrate deploy
```
