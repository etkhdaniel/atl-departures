import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const usage = sqliteTable('usage',{month:text('month').primaryKey(),count:integer('count').notNull().default(0)});
export const searches = sqliteTable('searches',{id:text('id').primaryKey(),started:integer('started').notNull()});
export const observations = sqliteTable('observations',{id:text('id').primaryKey(),route:text('route').notNull(),outbound:text('outbound').notNull(),inbound:text('inbound').notNull(),observed:integer('observed').notNull(),price:real('price').notNull(),offers:text('offers').notNull(),source:text('source').notNull()});
