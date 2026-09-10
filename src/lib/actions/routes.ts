"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";

export type RouteFormState = {
  error?: {
    origin?: string[];
    destination?: string[];
    _form?: string[];
  };
};

const RouteSchema = z.object({
  origin: z.string().min(1, "Origin required").max(100),
  destination: z.string().min(1, "Destination required").max(100),
});

export async function createRouteAction(
  _prev: RouteFormState | undefined,
  formData: FormData,
): Promise<RouteFormState> {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) {
    return { error: { _form: ["Not signed in"] } };
  }

  const parsed = RouteSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { origin, destination } = parsed.data;

  await prisma.route.create({
    data: {
      operatorId,
      origin,
      destination,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
