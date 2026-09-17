import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/permissions";
import { readJson, route, ApiError } from "@/lib/api-helpers";
import {
  OPTION_COLORS,
  diffFieldOptions,
  fieldNeedsOptions,
  scrubFieldValue,
} from "@/lib/custom-fields";

type Ctx = { params: Promise<{ fieldId: string }> };

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
      }),
    )
    .optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { fieldId } = await params;
  await requireRole("MEMBER");
  const body = await readJson(req, schema);

  const field = await prisma.customField.findUnique({
    where: { id: fieldId },
    include: { options: true },
  });
  if (!field) throw new ApiError(404, "Custom field not found");

  if (body.options !== undefined && !fieldNeedsOptions(field.type)) {
    throw new ApiError(400, "This field type does not have options");
  }

  let optionDiff: ReturnType<typeof diffFieldOptions> | undefined;
  if (body.options !== undefined) {
    optionDiff = diffFieldOptions(field.options, body.options);
    if (optionDiff.toUpdate.length + optionDiff.toCreate.length === 0) {
      throw new ApiError(400, "At least one option is required");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.name !== undefined) {
      await tx.customField.update({ where: { id: fieldId }, data: { name: body.name } });
    }

    if (optionDiff) {
      const diff = optionDiff;

      if (diff.toDelete.length) {
        const deleted = new Set(diff.toDelete);
        const values = await tx.customFieldValue.findMany({ where: { customFieldId: fieldId } });
        for (const row of values) {
          const next = scrubFieldValue(field.type, row.value, deleted);
          if (next === undefined) {
            await tx.customFieldValue.delete({ where: { id: row.id } });
          } else if (JSON.stringify(next) !== JSON.stringify(row.value)) {
            await tx.customFieldValue.update({
              where: { id: row.id },
              data: { value: next as Prisma.InputJsonValue },
            });
          }
        }
        await tx.customFieldOption.deleteMany({ where: { id: { in: diff.toDelete } } });
      }

      for (const opt of diff.toUpdate) {
        await tx.customFieldOption.update({
          where: { id: opt.id },
          data: { label: opt.label, position: opt.position },
        });
      }
      for (const opt of diff.toCreate) {
        await tx.customFieldOption.create({
          data: {
            customFieldId: fieldId,
            label: opt.label,
            position: opt.position,
            color: OPTION_COLORS[opt.position % OPTION_COLORS.length],
          },
        });
      }
    }

    return tx.customField.findUniqueOrThrow({
      where: { id: fieldId },
      include: { options: { orderBy: { position: "asc" } } },
    });
  });

  return NextResponse.json(updated);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { fieldId } = await params;
  await requireRole("MEMBER");
  const field = await prisma.customField.findUnique({ where: { id: fieldId } });
  if (!field) throw new ApiError(404, "Custom field not found");
  await prisma.customField.delete({ where: { id: fieldId } });
  return NextResponse.json({ ok: true });
});
