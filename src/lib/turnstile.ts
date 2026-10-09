interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

const CLOUDFLARE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  const isProd = process.env.NODE_ENV === "production";
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    (!isProd ? CLOUDFLARE_TEST_SECRET : null);

  if (!secretKey) {
    if (!isProd) {
      console.warn(
        "Turnstile: TURNSTILE_SECRET_KEY is not set. Bypassing verification in development.",
      );
      return { success: true };
    }
    console.error("Turnstile: TURNSTILE_SECRET_KEY is missing in production.");
    return {
      success: false,
      error: "Server security configuration error.",
    };
  }

  if (!token) {
    return {
      success: false,
      error: "Please complete the security check before submitting.",
    };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", secretKey);
    body.append("response", token);
    if (remoteIp) {
      body.append("remoteip", remoteIp);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!res.ok) {
      console.error(
        "Turnstile: Cloudflare verify endpoint returned status",
        res.status,
      );
      return {
        success: false,
        error: "Security verification service unavailable. Please try again.",
      };
    }

    const data: TurnstileVerifyResponse = await res.json();

    if (!data.success) {
      console.warn(
        "Turnstile: Verification failed with codes:",
        data["error-codes"],
      );
      return {
        success: false,
        error: "Security verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error(
      "Turnstile: Network/execution error during verification:",
      error,
    );
    return {
      success: false,
      error: "Failed to verify security token. Please try again later.",
    };
  }
}
