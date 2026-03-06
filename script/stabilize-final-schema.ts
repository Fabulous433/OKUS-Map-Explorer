import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString });

function log(message: string) {
  const time = new Date().toISOString();
  console.log(`[schema-stabilize] ${time} ${message}`);
}

async function enforceConstraint(client: pg.PoolClient, constraintName: string, ddl: string) {
  const existing = await client.query(
    `
      select 1
      from pg_constraint
      where conname = $1
      limit 1
    `,
    [constraintName],
  );

  if (existing.rowCount === 0) {
    await client.query(ddl);
    log(`Applied constraint: ${constraintName}`);
  }
}

async function run() {
  const client = await pool.connect();
  try {
    log("Starting hard cutover migration");
    await client.query("begin");

    await client.query(`
      update objek_pajak
      set nama_op = coalesce(nullif(trim(nama_op), ''), nullif(trim(nama_objek), '')),
          alamat_op = coalesce(nullif(trim(alamat_op), ''), nullif(trim(alamat), '')),
          created_at = coalesce(created_at, now()),
          updated_at = coalesce(updated_at, created_at, now());
    `);

    await client.query(`
      update objek_pajak op
      set rek_pajak_id = mrp.id
      from master_rekening_pajak mrp
      where op.rek_pajak_id is null
        and op.jenis_pajak is not null
        and lower(trim(op.jenis_pajak)) = lower(trim(mrp.jenis_pajak));
    `);

    await client.query(`
      update objek_pajak op
      set kecamatan_id = mk.cpm_kec_id
      from master_kecamatan mk
      where op.kecamatan_id is null
        and op.kecamatan is not null
        and lower(trim(op.kecamatan)) = lower(trim(mk.cpm_kecamatan));
    `);

    await client.query(`
      update objek_pajak op
      set kelurahan_id = mkel.cpm_kel_id
      from master_kelurahan mkel
      join master_kecamatan mkec on mkec.cpm_kode_kec = mkel.cpm_kode_kec
      where op.kelurahan_id is null
        and op.kelurahan is not null
        and lower(trim(op.kelurahan)) = lower(trim(mkel.cpm_kelurahan))
        and (op.kecamatan_id is null or op.kecamatan_id = mkec.cpm_kec_id);
    `);

    const unresolved = await client.query<{ unresolved_ids: string | null }>(`
      select string_agg(id::text, ', ' order by id) as unresolved_ids
      from objek_pajak
      where wp_id is null
         or rek_pajak_id is null
         or nama_op is null
         or nullif(trim(nama_op), '') is null
         or alamat_op is null
         or nullif(trim(alamat_op), '') is null
         or kecamatan_id is null
         or kelurahan_id is null;
    `);

    if (unresolved.rows[0]?.unresolved_ids) {
      throw new Error(
        `Preflight failed. Unresolved objek_pajak rows: ${unresolved.rows[0].unresolved_ids}`,
      );
    }

    await enforceConstraint(
      client,
      "objek_pajak_rek_pajak_id_master_rekening_pajak_id_fk",
      "alter table objek_pajak add constraint objek_pajak_rek_pajak_id_master_rekening_pajak_id_fk foreign key (rek_pajak_id) references master_rekening_pajak(id);",
    );
    await enforceConstraint(
      client,
      "objek_pajak_kecamatan_id_master_kecamatan_cpm_kec_id_fk",
      "alter table objek_pajak add constraint objek_pajak_kecamatan_id_master_kecamatan_cpm_kec_id_fk foreign key (kecamatan_id) references master_kecamatan(cpm_kec_id);",
    );
    await enforceConstraint(
      client,
      "objek_pajak_kelurahan_id_master_kelurahan_cpm_kel_id_fk",
      "alter table objek_pajak add constraint objek_pajak_kelurahan_id_master_kelurahan_cpm_kel_id_fk foreign key (kelurahan_id) references master_kelurahan(cpm_kel_id);",
    );

    await client.query(`
      alter table objek_pajak
        alter column wp_id set not null,
        alter column rek_pajak_id set not null,
        alter column nama_op set not null,
        alter column alamat_op set not null,
        alter column kecamatan_id set not null,
        alter column kelurahan_id set not null,
        alter column created_at set default now(),
        alter column created_at set not null,
        alter column updated_at set default now(),
        alter column updated_at set not null;
    `);

    await client.query(`
      alter table wajib_pajak
        alter column nama_wp drop not null,
        alter column alamat_wp drop not null,
        alter column created_at set default now(),
        alter column created_at set not null,
        alter column updated_at set default now(),
        alter column updated_at set not null;
    `);

    await client.query(`
      create unique index if not exists wajib_pajak_npwpd_unique_not_null
      on wajib_pajak(npwpd)
      where npwpd is not null;
    `);

    await client.query(`
      alter table objek_pajak
        drop column if exists jenis_pajak,
        drop column if exists nama_objek,
        drop column if exists alamat,
        drop column if exists kecamatan,
        drop column if exists kelurahan,
        drop column if exists detail_pajak,
        drop column if exists rating,
        drop column if exists review_count;
    `);

    await client.query(`
      drop table if exists objek_pajak_detail_hiburan cascade;
      drop table if exists objek_pajak_detail_hotel cascade;
      drop table if exists objek_pajak_detail_makanan cascade;
      drop table if exists objek_pajak_detail_parkir cascade;
      drop table if exists objek_pajak_detail_reklame cascade;
    `);

    await client.query("commit");
    log("Hard cutover migration completed");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("[schema-stabilize] Failed:", error);
  process.exit(1);
});
