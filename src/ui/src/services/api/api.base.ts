import { APIResponse } from "../../types/api.types";

/**
 * Executes a request against the Mailcow REST API of the given host.
 *
 * @param auth  Authentication — either an API token or an OAuth2 bearer token.
 * @param host  Mailcow hostname (e.g. "mail.example.com").
 * @param path  API path starting with "/" (e.g. "/api/v1/get/mailbox/all").
 * @param method HTTP method.
 * @param headers_values Optional additional request headers.
 * @param postData Optional JSON body for POST requests.
 */
export const APIQuery = async (
    auth: { token: string },
    host: string,
    path: string,
    method: 'POST' | 'GET',
    headers_values?: { name: string, value: string }[],
    postData?: "{}" | any
): Promise<APIResponse> => {
    try {
        const response = await fetch(`https://${host}${path}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.token}`,
                ...headers_values?.reduce((acc, { name, value }) => {
                    acc[name] = value;
                    return acc;
                }, {} as Record<string, string>)
            },
            body: method === 'POST' ? JSON.stringify(postData) : undefined
        });

        return response.json();
    } catch (err) {
        return { error_code: "0", request_id: "", speed: "0" }
    }
}
