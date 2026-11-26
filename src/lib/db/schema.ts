import { bigint, index, pgTable, text, timestamp, unique, uniqueIndex, uuid, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable(
    "users",
    {
        id:uuid("id").defaultRandom().primaryKey(),
        name:varchar("name",{length: 100}).notNull(),
        email:varchar("email",{length:255}).notNull(),
        passwordHash:text("password_hash").notNull(),
        createdAt:timestamp("created_at" , {
            withTimezone:true,
        }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("users_email_unique").on(table.email),
    ]
);

export const sessions = pgTable(
    "sessions",
    {
        id:uuid("id").defaultRandom().primaryKey(),
        userId:uuid("user_id")
        .notNull()
        .references(()=> users.id, {onDelete: "cascade"}),
        tokenHash: text("token_hash").notNull().unique(),
        expiresAt:timestamp("expires_at", {
            withTimezone:true,
        }).notNull(),
        createdAt:timestamp("created_at", {
            withTimezone:true,
        }).defaultNow().notNull(),
    },
    (table) => [
        index("sessions_user_id_idx").on(table.userId),
    ]
);

// ---------------------------------------------------------------------------
// File storage (Phase 3). File contents live in object storage; these tables
// hold metadata only. Every row belongs to exactly one user.
// ---------------------------------------------------------------------------

export const folders = pgTable(
    "folders",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 255 }).notNull(),
        parentFolderId: uuid("parent_folder_id").references(
            (): AnyPgColumn => folders.id,
            { onDelete: "cascade" }
        ),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("folders_user_parent_idx").on(table.userId, table.parentFolderId),
        // No two sibling folders with the same name (root-level included).
        unique("folders_user_parent_name_unique")
            .on(table.userId, table.parentFolderId, table.name)
            .nullsNotDistinct(),
    ]
);

export const fileStatus = ["pending", "ready"] as const;

export const files = pgTable(
    "files",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        // Deleting a folder must not silently drop stored objects; files fall
        // back to the root and folder deletion handles them explicitly.
        folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
        originalName: varchar("original_name", { length: 255 }).notNull(),
        storedName: varchar("stored_name", { length: 64 }).notNull(),
        storageKey: text("storage_key").notNull().unique(),
        mimeType: varchar("mime_type", { length: 255 }).notNull(),
        extension: varchar("extension", { length: 16 }).notNull().default(""),
        category: varchar("category", { length: 16 }).notNull().default("other"),
        size: bigint("size", { mode: "number" }).notNull(),
        storageProvider: varchar("storage_provider", { length: 32 }).notNull(),
        // "pending" until the upload is verified; pending rows reserve quota
        // and are cleaned up after uploadExpiresAt.
        status: varchar("status", { length: 16, enum: fileStatus }).notNull().default("pending"),
        uploadExpiresAt: timestamp("upload_expires_at", { withTimezone: true }),
        // Set when the file is moved to Trash; it is permanently deleted
        // TRASH_RETENTION_DAYS later. Null = in the user's library.
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("files_user_deleted_idx").on(table.userId, table.deletedAt),
        index("files_user_status_created_idx").on(table.userId, table.status, table.createdAt),
        index("files_user_category_idx").on(table.userId, table.category),
        index("files_user_folder_idx").on(table.userId, table.folderId),
    ]
);
