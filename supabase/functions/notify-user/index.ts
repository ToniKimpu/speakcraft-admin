// Targeted push to ONE user's FCM topic (their auth uid). Sibling of the
// broadcast `send-notification` function, but:
//   * sends to a caller-supplied `topic` instead of the hardcoded all-users one
//   * data-only payload with `title`/`message` keys, matching what the mobile
//     app's flutter_local_notifications display reads (foreground + background)
//   * backend-only: rejects callers that aren't using the service-role key
//
// Reuses the same FIREBASE_SERVICE_ACCOUNT_PROD secret as send-notification.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { JWT } from "npm:google-auth-library@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function getServiceAccount(env?: string) {
  // The dev and prod mobile builds register with separate Firebase projects, so
  // a push must be minted with the matching project's service account.
  const key = env === "dev"
    ? "FIREBASE_SERVICE_ACCOUNT_DEV"
    : "FIREBASE_SERVICE_ACCOUNT_PROD";
  const raw = Deno.env.get(key);
  if (!raw) throw new Error(`Missing ${key}`);
  return JSON.parse(raw);
}

function getAccessToken(
  { client_email, private_key }: { client_email: string; private_key: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: client_email,
      key: private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    jwtClient.authorize((err, tokens) => {
      if (err || !tokens?.access_token) return reject(err);
      resolve(tokens.access_token);
    });
  });
}

// Reads the `role` claim from a JWT (the gateway already verified its
// signature). Used to require service_role — i.e. backend callers only.
function jwtRole(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return json.role ?? null;
  } catch {
    return null;
  }
}

async function sendToFcm(projectId: string, message: unknown, accessToken: string) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    console.error("FCM send failed:", json);
    throw new Error("Notification send failed");
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders });
  }

  // Backend-only: require a service_role JWT (the admin invokes with one).
  // Regular users carry an `authenticated` token and are rejected.
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (jwtRole(token) !== "service_role") {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      headers: corsHeaders,
      status: 401,
    });
  }

  try {
    const { topic, title, body, data, env } = await req.json();
    if (!topic || !title || !body) {
      return new Response(
        JSON.stringify({ message: "topic, title and body are required" }),
        { headers: corsHeaders, status: 400 },
      );
    }

    // FCM requires every data value to be a string. The app reads `title` and
    // `message` from the data map.
    const fcmData: Record<string, string> = {
      title: String(title),
      message: String(body),
    };
    for (const [k, v] of Object.entries(data ?? {})) {
      fcmData[k] = String(v);
    }

    const serviceAccount = getServiceAccount(env);
    const accessToken = await getAccessToken(serviceAccount);
    const result = await sendToFcm(
      serviceAccount.project_id,
      { topic, data: fcmData, android: { priority: "high" } },
      accessToken,
    );

    return new Response(JSON.stringify({ message: "sent", result }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("notify-user error:", err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
