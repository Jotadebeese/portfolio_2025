import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_stage" AS ENUM('indevelopment', 'live');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_stage" AS ENUM('indevelopment', 'live');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_blog_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE IF NOT EXISTS "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_tablet_url" varchar,
  	"sizes_tablet_width" numeric,
  	"sizes_tablet_height" numeric,
  	"sizes_tablet_mime_type" varchar,
  	"sizes_tablet_filesize" numeric,
  	"sizes_tablet_filename" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "projects_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "projects_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"stage" "enum_projects_stage" DEFAULT 'indevelopment',
  	"live_url" varchar,
  	"github_url" varchar,
  	"published_at" timestamp(3) with time zone,
  	"title" varchar,
  	"short_description" jsonb,
  	"icon_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_projects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE IF NOT EXISTS "projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"techs_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "_projects_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_projects_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_stage" "enum__projects_v_version_stage" DEFAULT 'indevelopment',
  	"version_live_url" varchar,
  	"version_github_url" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_title" varchar,
  	"version_short_description" jsonb,
  	"version_icon_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE IF NOT EXISTS "_projects_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"techs_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"color" varchar DEFAULT '#ffffff' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "techs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"icon_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blog_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"color" varchar DEFAULT '#ffffff' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blog_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "blog_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "blog" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"featured_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"title" varchar,
  	"short_description" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_blog_status" DEFAULT 'draft'
  );
  
  CREATE TABLE IF NOT EXISTS "blog_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blog_tags_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_featured_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_title" varchar,
  	"version_short_description" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__blog_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE IF NOT EXISTS "_blog_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"blog_tags_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"projects_id" integer,
  	"tags_id" integer,
  	"techs_id" integer,
  	"blog_tags_id" integer,
  	"blog_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DO $$ BEGIN
   ALTER TABLE "projects_blocks_text" ADD CONSTRAINT "projects_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects_blocks_image" ADD CONSTRAINT "projects_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects_blocks_image" ADD CONSTRAINT "projects_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects" ADD CONSTRAINT "projects_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_techs_fk" FOREIGN KEY ("techs_id") REFERENCES "public"."techs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_blocks_text" ADD CONSTRAINT "_projects_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_blocks_image" ADD CONSTRAINT "_projects_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_blocks_image" ADD CONSTRAINT "_projects_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_icon_id_media_id_fk" FOREIGN KEY ("version_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_techs_fk" FOREIGN KEY ("techs_id") REFERENCES "public"."techs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "techs" ADD CONSTRAINT "techs_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_blocks_text" ADD CONSTRAINT "blog_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_blocks_image" ADD CONSTRAINT "blog_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_blocks_image" ADD CONSTRAINT "blog_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog" ADD CONSTRAINT "blog_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v_blocks_text" ADD CONSTRAINT "_blog_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v_blocks_image" ADD CONSTRAINT "_blog_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v_blocks_image" ADD CONSTRAINT "_blog_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_parent_id_blog_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_techs_fk" FOREIGN KEY ("techs_id") REFERENCES "public"."techs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_tags_fk" FOREIGN KEY ("blog_tags_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_tablet_sizes_tablet_filename_idx" ON "media" USING btree ("sizes_tablet_filename");
  CREATE INDEX IF NOT EXISTS "projects_blocks_text_order_idx" ON "projects_blocks_text" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "projects_blocks_text_parent_id_idx" ON "projects_blocks_text" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "projects_blocks_text_path_idx" ON "projects_blocks_text" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "projects_blocks_image_order_idx" ON "projects_blocks_image" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "projects_blocks_image_parent_id_idx" ON "projects_blocks_image" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "projects_blocks_image_path_idx" ON "projects_blocks_image" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "projects_blocks_image_image_idx" ON "projects_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "projects_icon_idx" ON "projects" USING btree ("icon_id");
  CREATE INDEX IF NOT EXISTS "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE INDEX IF NOT EXISTS "projects_rels_order_idx" ON "projects_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "projects_rels_parent_idx" ON "projects_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "projects_rels_path_idx" ON "projects_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "projects_rels_tags_id_idx" ON "projects_rels" USING btree ("tags_id");
  CREATE INDEX IF NOT EXISTS "projects_rels_techs_id_idx" ON "projects_rels" USING btree ("techs_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_text_order_idx" ON "_projects_v_blocks_text" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_text_parent_id_idx" ON "_projects_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_text_path_idx" ON "_projects_v_blocks_text" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_image_order_idx" ON "_projects_v_blocks_image" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_image_parent_id_idx" ON "_projects_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_image_path_idx" ON "_projects_v_blocks_image" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "_projects_v_blocks_image_image_idx" ON "_projects_v_blocks_image" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX IF NOT EXISTS "_projects_v_version_version_icon_idx" ON "_projects_v" USING btree ("version_icon_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX IF NOT EXISTS "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX IF NOT EXISTS "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX IF NOT EXISTS "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE INDEX IF NOT EXISTS "_projects_v_rels_order_idx" ON "_projects_v_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "_projects_v_rels_parent_idx" ON "_projects_v_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_rels_path_idx" ON "_projects_v_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "_projects_v_rels_tags_id_idx" ON "_projects_v_rels" USING btree ("tags_id");
  CREATE INDEX IF NOT EXISTS "_projects_v_rels_techs_id_idx" ON "_projects_v_rels" USING btree ("techs_id");
  CREATE INDEX IF NOT EXISTS "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "techs_icon_idx" ON "techs" USING btree ("icon_id");
  CREATE INDEX IF NOT EXISTS "techs_updated_at_idx" ON "techs" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "techs_created_at_idx" ON "techs" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blog_tags_updated_at_idx" ON "blog_tags" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_tags_created_at_idx" ON "blog_tags" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blog_blocks_text_order_idx" ON "blog_blocks_text" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "blog_blocks_text_parent_id_idx" ON "blog_blocks_text" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "blog_blocks_text_path_idx" ON "blog_blocks_text" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "blog_blocks_image_order_idx" ON "blog_blocks_image" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "blog_blocks_image_parent_id_idx" ON "blog_blocks_image" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "blog_blocks_image_path_idx" ON "blog_blocks_image" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "blog_blocks_image_image_idx" ON "blog_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_slug_idx" ON "blog" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "blog_featured_image_idx" ON "blog" USING btree ("featured_image_id");
  CREATE INDEX IF NOT EXISTS "blog_updated_at_idx" ON "blog" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_created_at_idx" ON "blog" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blog__status_idx" ON "blog" USING btree ("_status");
  CREATE INDEX IF NOT EXISTS "blog_rels_order_idx" ON "blog_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "blog_rels_parent_idx" ON "blog_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "blog_rels_path_idx" ON "blog_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "blog_rels_blog_tags_id_idx" ON "blog_rels" USING btree ("blog_tags_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_text_order_idx" ON "_blog_v_blocks_text" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_text_parent_id_idx" ON "_blog_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_text_path_idx" ON "_blog_v_blocks_text" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_image_order_idx" ON "_blog_v_blocks_image" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_image_parent_id_idx" ON "_blog_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_image_path_idx" ON "_blog_v_blocks_image" USING btree ("_path");
  CREATE INDEX IF NOT EXISTS "_blog_v_blocks_image_image_idx" ON "_blog_v_blocks_image" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_parent_idx" ON "_blog_v" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_version_version_slug_idx" ON "_blog_v" USING btree ("version_slug");
  CREATE INDEX IF NOT EXISTS "_blog_v_version_version_featured_image_idx" ON "_blog_v" USING btree ("version_featured_image_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_version_version_updated_at_idx" ON "_blog_v" USING btree ("version_updated_at");
  CREATE INDEX IF NOT EXISTS "_blog_v_version_version_created_at_idx" ON "_blog_v" USING btree ("version_created_at");
  CREATE INDEX IF NOT EXISTS "_blog_v_version_version__status_idx" ON "_blog_v" USING btree ("version__status");
  CREATE INDEX IF NOT EXISTS "_blog_v_created_at_idx" ON "_blog_v" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "_blog_v_updated_at_idx" ON "_blog_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "_blog_v_latest_idx" ON "_blog_v" USING btree ("latest");
  CREATE INDEX IF NOT EXISTS "_blog_v_rels_order_idx" ON "_blog_v_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "_blog_v_rels_parent_idx" ON "_blog_v_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_blog_v_rels_path_idx" ON "_blog_v_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "_blog_v_rels_blog_tags_id_idx" ON "_blog_v_rels" USING btree ("blog_tags_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_techs_id_idx" ON "payload_locked_documents_rels" USING btree ("techs_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_tags_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "projects_blocks_text" CASCADE;
  DROP TABLE "projects_blocks_image" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "projects_rels" CASCADE;
  DROP TABLE "_projects_v_blocks_text" CASCADE;
  DROP TABLE "_projects_v_blocks_image" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "_projects_v_rels" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "techs" CASCADE;
  DROP TABLE "blog_tags" CASCADE;
  DROP TABLE "blog_blocks_text" CASCADE;
  DROP TABLE "blog_blocks_image" CASCADE;
  DROP TABLE "blog" CASCADE;
  DROP TABLE "blog_rels" CASCADE;
  DROP TABLE "_blog_v_blocks_text" CASCADE;
  DROP TABLE "_blog_v_blocks_image" CASCADE;
  DROP TABLE "_blog_v" CASCADE;
  DROP TABLE "_blog_v_rels" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_projects_stage";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum__projects_v_version_stage";
  DROP TYPE "public"."enum__projects_v_version_status";
  DROP TYPE "public"."enum_blog_status";
  DROP TYPE "public"."enum__blog_v_version_status";`)
}
