"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const response = await auth?.api.signUpEmail({
      body: { email, password, name: fullName },
    });

    if (response) {
      await inngest.send({
        name: "app/user.created",
        data: {
          email,
          name: fullName,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
        },
      });
    }

    return { success: true, data: response };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Sign-up error:", error);
    }

    return { success: false, error: "Sign Up failed. Please try again." };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth?.api.signInEmail({
      body: { email, password },
    });

    return { success: true, data: response };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Sign-in error:", error);
    }

    return { success: false, error: "Sign In failed. Please try again." };
  }
};

export const signOut = async () => {
  try {
    await auth?.api.signOut({ headers: await headers() });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("Sign-out error:", e);
    }
    return { success: false, error: "Sign Out failed. Please try again." };
  }
};
