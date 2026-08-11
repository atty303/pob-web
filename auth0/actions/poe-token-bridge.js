const AUTH0_DOMAIN = "pob-web.us.auth0.com";
const POB_CLIENT_ID = "o8TOT9gDHzztbdIIIV54HxlfaSMFYTeH";
const POE_CONNECTION = "path-of-exile";
const POE_ACCESS_TOKEN_CLAIM = "https://pob.cool/poe/access_token";

async function readJson(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} failed with status ${response.status}`);
  }
  return await response.json();
}

async function getManagementAccessToken(clientId, clientSecret) {
  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  const token = await readJson(response, "Management API token request");
  if (typeof token.access_token !== "string") {
    throw new Error("Management API token response did not contain an access token");
  }
  return token.access_token;
}

async function getPoeAccessToken(userId, managementAccessToken) {
  const response = await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
    { headers: { authorization: `Bearer ${managementAccessToken}` } },
  );
  const user = await readJson(response, "Management API user request");
  const identity = user.identities?.find(({ connection }) => connection === POE_CONNECTION);
  return typeof identity?.access_token === "string" ? identity.access_token : undefined;
}

exports.onExecutePostLogin = async (event, api) => {
  if (event.client.client_id !== POB_CLIENT_ID || event.connection.name !== POE_CONNECTION) {
    return;
  }

  try {
    const managementAccessToken = await getManagementAccessToken(
      event.secrets.MANAGEMENT_CLIENT_ID,
      event.secrets.MANAGEMENT_CLIENT_SECRET,
    );
    const poeAccessToken = await getPoeAccessToken(event.user.user_id, managementAccessToken);
    if (poeAccessToken) {
      api.accessToken.setCustomClaim(POE_ACCESS_TOKEN_CLAIM, poeAccessToken);
    } else {
      console.log("PoE identity did not contain an access token");
    }
  } catch (error) {
    console.log(error instanceof Error ? error.message : "PoE token bridge failed");
  }
};
