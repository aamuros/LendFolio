type SignupEmailClient = {
  rpc: (
    functionName: "signup_email_exists",
    args: { p_email: string },
  ) => PromiseLike<{ data: boolean | null; error: unknown }>;
};

export async function signupEmailExists(
  supabase: SignupEmailClient,
  email: string,
) {
  const { data, error } = await supabase.rpc("signup_email_exists", {
    p_email: email,
  });

  if (error) {
    throw error;
  }

  return data === true;
}
