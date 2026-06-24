// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { JWT } from "npm:google-auth-library@9";
// ---------- Supabase ----------
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.info("Server started");
// ---------- Firebase Topics ----------
const ALL_NEW_CONTENT = "all-new-contents";
// ---------- CORS Headers ----------
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
// ---------- Firebase Service Accounts ----------
const firebaseServiceAccounts = {
  dev: JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_DEV") ?? "{}"),
  prod: JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_PROD") ?? "{}")
};
export const getServiceAccount = () => {
  return JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_PROD"));
}
// ---------- Firebase Auth ----------
export const getAccessToken = ({ client_email, private_key }) => {
  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: client_email,
      key: private_key,
      scopes: [
        "https://www.googleapis.com/auth/firebase.messaging"
      ]
    });
    jwtClient.authorize((err, tokens) => {
      if (err || !tokens?.access_token) return reject(err);
      resolve(tokens.access_token);
    });
  });
};
// ---------- Firebase Notification ----------
export async function sendNotification(projectId, notiBody, accessToken) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: notiBody
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Push notification send failed:", json);
    throw new Error("Notification send failed");
  }
  console.log("Push notification sent successfully.", json);
  return json;
}
// ---------- Notification Trigger ----------
export async function runNotificationTrigger(payload) {
  console.log("runNotificationTrigger payload:", payload);
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    return new Response(JSON.stringify({
      message: "No service account"
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
  const accessToken = await getAccessToken(serviceAccount);
  const data = {
    title: payload.title,
    message: payload.message
  };
  if (payload.poster_image && payload.poster_image.trim() !== "") {
    data.poster_image = payload.poster_image;
  }
  const notiBodyMsg = {
    topic: ALL_NEW_CONTENT,
    data
  };
  const notiBody = JSON.stringify({
    message: notiBodyMsg
  });
  await sendNotification(serviceAccount.project_id, notiBody, accessToken);
  return new Response(JSON.stringify({
    message: "Notification sent!"
  }), {
    headers: corsHeaders
  });
}
// ---------- Request Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      headers: corsHeaders
    });
  }
  try {
    const payload = await req.json();
    return await runNotificationTrigger(payload);
  } catch (err) {
    console.error("Error handling request:", err);
    return new Response(JSON.stringify({
      message: "Internal Server Error"
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
