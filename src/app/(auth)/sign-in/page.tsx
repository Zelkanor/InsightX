"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { signInWithEmail } from "@/lib/actions/auth.action";

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const router = useRouter();

  const onSubmit = async (data: SignInFormData) => {
    if (process.env.NODE_ENV === "development") {
      // biome-ignore lint/correctness/noUnusedVariables: We want to log the form data without the password for debugging purposes
      const { password, ...safeData } = data;
      console.debug("Form data:", safeData);
    }
    const result = await signInWithEmail(data);
    if (result.success) {
      router.push("/");
    } else {
      toast.error("Sign-in failed", {
        description: result.error || "Failed to sign in. Please try again.",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Log In Your Account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="email"
          label="Email"
          placeholder="contact@example.com"
          register={register}
          type="email"
          error={errors.email}
          validation={{
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+$/i,
              message: "Please enter a valid email address",
            },
          }}
        />
        <InputField
          name="password"
          label="Password"
          placeholder="Enter your password"
          register={register}
          type="password"
          error={errors.password}
          validation={{
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          }}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Signing In" : "Sign In"}
        </Button>

        <FooterLink
          text="Don't have an account?"
          linkText="Sign Up"
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default SignIn;
