"use server";

import { redirect } from "next/navigation";
import { publicAction } from "@/server/actions/safe-action";
import { authService } from "@/server/services/auth.service";
import { loginSchema, registerSchema } from "./schemas";

export const loginAction = publicAction(loginSchema, async (input) => {
  await authService.login(input);
  return null;
});

export const registerAction = publicAction(registerSchema, async (input) => {
  await authService.register(input);
  return null;
});

export async function logoutAction() {
  await authService.logout();
  redirect("/login");
}
