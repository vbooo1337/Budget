# Бюджет — PWA приложение

Совместный трекер доходов и расходов с синхронизацией в реальном времени.

## Возможности
- Добавление доходов и расходов
- Синхронизация в реальном времени (оба видят изменения мгновенно)
- Статистика по категориям
- Работает как приложение на iPhone (PWA)

## Деплой на Vercel

1. Создайте репозиторий на GitHub и загрузите эту папку
2. Зайдите на vercel.com → New Project → выберите репозиторий
3. Нажмите Deploy

## Установка на iPhone

1. Откройте сайт в Safari
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой)
3. Выберите "На экран «Домой»"
4. Нажмите "Добавить"

## Supabase — таблица

Выполните в SQL Editor:

```sql
create table transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  category text not null,
  amount numeric not null,
  date text not null,
  note text,
  created_at timestamp with time zone default now()
);
```
