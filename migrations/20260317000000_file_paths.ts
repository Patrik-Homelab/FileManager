/*eslint-disable @typescript-eslint/no-explicit-any*/

import { Kysely } from 'kysely';

export const up = async (conn: Kysely<any>) => {
    await conn.schema
        .alterTable('files')
        .addColumn('path', 'varchar(255)', (cb) => cb.defaultTo(''))
        .execute();
};

export const down = async (conn: Kysely<any>) => {
    await conn.schema.alterTable('files').dropColumn('path').execute();
};
