import http from "http";
import https from "https";
import zlib from "zlib";

/**
 * Downloads the IHC project file from a controller via SOAP.
 * Uses simple string-template SOAP calls — no external XML library needed.
 *
 * Flow:
 * 1. authenticate(username, password) → session cookie
 * 2. getProjectInfo() → major/minor revision (not used but validates session)
 * 3. getIHCProjectNumberOfSegments() → segment count
 * 4. getIHCProjectSegment(n) × N → base64 segments → gunzip → XML
 */
export async function downloadProject(
    host: string,
    port: number,
    username: string,
    password: string,
): Promise<Buffer> {
    const baseUrl = `http://${host}:${port}`;
    let cookie = "";

    // Step 1: Authenticate
    console.log(`  Authenticating with ${host}:${port}...`);
    const authBody = soapEnvelope(
        `<authenticate1 xmlns="utcs">` +
        `<username>${xmlEscape(username)}</username>` +
        `<password>${xmlEscape(password)}</password>` +
        `<application>treeview</application>` +
        `</authenticate1>`
    );
    const authResp = await doPost(baseUrl + "/ws/AuthenticationService", "authenticate", authBody, cookie);
    cookie = extractCookie(authResp.headers);

    if (!authResp.body.includes(">true</ns1:loginWasSuccessful>")) {
        throw new Error("IHC authentication failed");
    }
    console.log("  Authenticated.");

    const disconnect = () =>{
        console.log("  Disconnecting...");
        doPost(baseUrl + "/ws/AuthenticationService", "disconnect", soapEnvelope(``), cookie).catch(() => {});
        console.log("  Disconnected.");
    }

    try {
        // Step 2: Get project info (need revision numbers for segment download)
        const infoBody = soapEnvelope(``);
        const infoResp = await doPost(baseUrl + "/ws/ControllerService", "getProjectInfo", infoBody, cookie);
        const majorMatch = infoResp.body.match(/<(?:\w+:)?projectMajorRevision[^>]*>(\d+)</);
        const minorMatch = infoResp.body.match(/<(?:\w+:)?projectMinorRevision[^>]*>(\d+)</);
        const majorRev = majorMatch ? majorMatch[1] : "0";
        const minorRev = minorMatch ? minorMatch[1] : "0";
        console.log(`  Project revision: ${majorRev}.${minorRev}`);

        // Step 3: Get segment count (empty body — WSDL defines no input parts)
        const segCountBody = soapEnvelope(``);
        const segCountResp = await doPost(baseUrl + "/ws/ControllerService", "getIHCProjectNumberOfSegments", segCountBody, cookie);
        const segCountMatch = segCountResp.body.match(/>(\d+)</);
        if (!segCountMatch) {
            throw new Error("Failed to get project segment count: " + segCountResp.body.slice(0, 300));
        }
        const segmentCount = parseInt(segCountMatch[1], 10);
        console.log(`  Project has ${segmentCount} segment(s).`);

        // Step 4: Download all segments
        // WSDL uses separate top-level elements: getIHCProjectSegment1 (index),
        // getIHCProjectSegment2 (majorRevision), getIHCProjectSegment3 (minorRevision)
        const segments: Buffer[] = [];
        for (let i = 0; i < segmentCount; i++) {
            const segBody = soapEnvelope(
                `<getIHCProjectSegment1 xmlns="utcs">${i}</getIHCProjectSegment1>` +
                `<getIHCProjectSegment2 xmlns="utcs">${majorRev}</getIHCProjectSegment2>` +
                `<getIHCProjectSegment3 xmlns="utcs">${minorRev}</getIHCProjectSegment3>`
            );
            const segResp = await doPost(baseUrl + "/ws/ControllerService", "getIHCProjectSegment", segBody, cookie);

            // Extract base64 data from <data>...</data> or <ns1:data>...</ns1:data>
            const dataMatch = segResp.body.match(/<(?:\w+:)?data[^>]*>([^<]+)<\/(?:\w+:)?data>/);
            if (!dataMatch) {
                throw new Error(`Failed to get project segment ${i}: ${segResp.body.slice(0, 500)}`);
            }
            segments.push(Buffer.from(dataMatch[1], "base64"));
            process.stdout.write(`  Downloaded segment ${i + 1}/${segmentCount}\r`);
        }
        console.log("");

        // Step 4: Disconnect
        await disconnect();

        // Concatenate and gunzip
        const compressed = Buffer.concat(segments);
        const xmlBuffer = zlib.gunzipSync(compressed);
        // IHC project XML is ISO-8859-1 (latin1) encoded.
        // Return as raw Buffer so the caller can save it without encoding round-trip.
        console.log(`  Project XML: ${xmlBuffer.length} bytes`);
        return xmlBuffer;
    } catch (err) {
        await disconnect();
        throw err;
    }
}

function soapEnvelope(body: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>` +
        `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
        `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tns="utcs">` +
        `<soap:Body>${body}</soap:Body></soap:Envelope>`;
}

function xmlEscape(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function extractCookie(headers: Record<string, string | string[] | undefined>): string {
    const setCookie = headers["set-cookie"];
    if (!setCookie) return "";
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of cookies) {
        const m = c.match(/JSESSIONID=([^;]+)/);
        if (m) return m[1];
    }
    return "";
}

type HttpResponse = {
    body: string;
    headers: Record<string, string | string[] | undefined>;
};

function doPost(url: string, action: string, body: string, cookie: string): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const transport = parsed.protocol === "https:" ? https : http;

        const req = transport.request(
            {
                hostname: parsed.hostname,
                port: parsed.port,
                path: parsed.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "Content-Length": Buffer.byteLength(body, "utf-8").toString(),
                    "SOAPAction": action,
                    "Connection": "close",
                    ...(cookie ? { "Cookie": `JSESSIONID=${cookie}` } : {}),
                },
                agent: false, // disable keep-alive — IHC closes connections between requests
                timeout: 15000,
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => {
                    const responseBody = Buffer.concat(chunks).toString("utf-8");
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode} from ${parsed.pathname} (${action}): ${responseBody.slice(0, 500) || "(empty body)"}`));
                        return;
                    }
                    resolve({
                        body: responseBody,
                        headers: res.headers as Record<string, string | string[] | undefined>,
                    });
                });
            },
        );
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });
        req.write(body);
        req.end();
    });
}
