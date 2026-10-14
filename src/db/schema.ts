import { pgTable, text, timestamp, varchar, real } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 32 }).notNull().default('student'),
  documentId: varchar('document_id', { length: 64 }).notNull().unique(),
  facultyOrDept: text('faculty_or_dept'),
  phone: varchar('phone', { length: 32 }),
  avatarUrl: text('avatar_url'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessionsTable = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const entryPointsTable = pgTable('entry_points', {
  id: text('id').primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: text('name').notNull(),
  campus: text('campus').notNull().default('UNIMINUTO Sede Ibagué'),
  gateType: varchar('gate_type', { length: 32 }).notNull().default('pedestrian'),
  cameraUrl: text('camera_url'),
  barrierControllerIp: varchar('barrier_controller_ip', { length: 64 }),
  isActive: varchar('is_active', { length: 16 }).notNull().default('true'),
});

export const accessLogsTable = pgTable('access_logs', {
  id: text('id').primaryKey(),
  direction: varchar('direction', { length: 16 }).notNull().default('entry'), // 'entry' | 'exit'
  entryPoint: text('entry_point').notNull(),
  method: varchar('method', { length: 64 }).notNull().default('facial_recognition'),
  status: varchar('status', { length: 32 }).notNull(), // 'authorized' | 'denied'
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  userRole: varchar('user_role', { length: 32 }).notNull(),
  documentId: varchar('document_id', { length: 64 }),
  confidenceScore: real('confidence_score').notNull().default(0.98),
  notes: text('notes'),
  snapshotUrl: text('snapshot_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
