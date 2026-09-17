import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CustomFieldType } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";
import { OPTION_COLORS, fieldNeedsOptions } from "@/lib/custom-fields";

type Ctx = { params: Promise<{ listId: string }> };

const schema = z.object({
  name: z.string().trim().min(1, "name is required"),
  type: z.enum([
    "TEXT", "TEXTAREA", "NUMBER", "MONEY", "DROPDOWN", "LABELS",
    "DATE", "CHECKBOX", "URL", "EMAIL", "PHONE", "RATING", "PROGRESS",
  ]),
  options: z.array(z.string()).optional(),
});

export const POST = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  await requireRole("MEMBER");
  const { name, type, options } = await readJson(req, schema);
  const last = await prisma.customField.findFirst({ where: { listId }, orderBy: { position: "desc" } });
  const needsOptions = fieldNeedsOptions(type);

  const field = await prisma.customField.create({
    data: {
      listId,
      name,
      type: type as CustomFieldType,
      position: (last?.position ?? 0) + 1,
      options:
        needsOptions && options?.length
          ? {
              create: options
                .filter((o) => o.trim())
                .map((label, i) => ({
                  label: label.trim(),
                  color: OPTION_COLORS[i % OPTION_COLORS.length],
                  position: i,
                })),
            }
          : undefined,
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(field, { status: 201 });
});
