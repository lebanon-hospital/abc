CREATE TABLE "doctor_departments" (
	"doctor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "doctor_departments_doctor_id_department_id_pk" PRIMARY KEY("doctor_id","department_id")
);
--> statement-breakpoint
ALTER TABLE "doctor_departments" ADD CONSTRAINT "doctor_departments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_departments" ADD CONSTRAINT "doctor_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doctor_departments_department_idx" ON "doctor_departments" USING btree ("department_id");--> statement-breakpoint
INSERT INTO "doctor_departments" ("doctor_id", "department_id") SELECT "id", "department_id" FROM "doctors" WHERE "department_id" IS NOT NULL ON CONFLICT DO NOTHING;
