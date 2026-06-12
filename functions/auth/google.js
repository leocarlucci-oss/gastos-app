export async function onRequestPost(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const clientId = context.env.GOOGLE_CLIENT_ID;
  const clientSecret = context.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "OAuth no configurado" }), { status: 500, headers });
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Body inválido" }), { status: 400, headers });
  }

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);

  if (body.grant_type === "refresh_token") {
    // Renovar access token usando refresh token
    if (!body.refresh_token) {
      return new Response(JSON.stringify({ error: "Falta refresh_token" }), { status: 400, headers });
    }
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", body.refresh_token);
  } else {
    // Intercambiar authorization code por tokens
    if (!body.code || !body.redirect_uri) {
      return new Response(JSON.stringify({ error: "Falta code o redirect_uri" }), { status: 400, headers });
    }
    params.set("grant_type", "authorization_code");
    params.set("code", body.code);
    params.set("redirect_uri", body.redirect_uri);
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: response.status, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
