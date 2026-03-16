/*eslint-disable @typescript-eslint/no-explicit-any*/

import { Kysely, sql } from 'kysely';

export const up = async (conn: Kysely<any>) => {
    // Create folders table
    await conn.schema
        .createTable('folders')
        .addColumn('id', 'varchar(36)', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('created_at', 'datetime', (col) =>
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('created_by', 'integer', (col) =>
            col.notNull().references('users.id').onDelete('cascade')
        )
        .execute();

    // Create folder_files junction table
    await conn.schema
        .createTable('folder_files')
        .addColumn('folder_id', 'varchar(36)', (col) =>
            col.notNull().references('folders.id').onDelete('cascade')
        )
        .addColumn('file_id', 'varchar(36)', (col) =>
            col.notNull().references('files.id').onDelete('cascade')
        )
        .addPrimaryKeyConstraint('folder_files_pk', ['folder_id', 'file_id'])
        .execute();
};

export const down = async (conn: Kysely<any>) => {
    await conn.schema.dropTable('folder_files').execute();
    await conn.schema.dropTable('folders').execute();
};
