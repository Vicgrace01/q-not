"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";

export async function updateOperatorProfileAction(formData: FormData): Promise<void> {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
  }).safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) redirect("/dashboard/profile?error=name");

  await prisma.operator.update({
    where: { id: operatorId },
    data: { name: parsed.data.name },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  redirect("/dashboard/profile?saved=1");
}
