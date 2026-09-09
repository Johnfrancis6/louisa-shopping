/**
 * Handler HTTP Better Auth (App Router). Toutes les routes /api/auth/* —
 * sign-in, sign-up, sign-out, session, callbacks — passent par ici.
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
