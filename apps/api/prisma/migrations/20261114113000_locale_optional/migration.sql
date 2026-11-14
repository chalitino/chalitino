-- AlterTable: taalvoorkeur optioneel; leeg = automatisch op basis van land
ALTER TABLE "Company" ALTER COLUMN "locale" DROP NOT NULL,
ALTER COLUMN "locale" DROP DEFAULT;
UPDATE "Company" SET "locale" = NULL WHERE "locale" = 'nl';
