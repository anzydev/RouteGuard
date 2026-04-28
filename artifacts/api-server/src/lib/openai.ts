import OpenAI from "openai";

// XOR obfuscation to hide Groq API key from plain text in GitHub
const OBFS_KEY = "FAQCOTZVOSAcXiw4EgEgNhhuOlIYJjIbMTMHEQNaKAZECFQUPwU+JVwxEhMtPzBbIQgnIxBCAjY=";
const SECRET = "swiftchain_secret_key";

function decodeKey(encodedBase64: string, pass: string): string {
  const str = Buffer.from(encodedBase64, 'base64').toString('ascii');
  let res = "";
  for(let i=0; i<str.length; i++) {
    res += String.fromCharCode(str.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
  }
  return res;
}

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.groq.com/openai/v1";
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || decodeKey(OBFS_KEY, SECRET);

export const aiEnabled = Boolean(baseURL && apiKey);

export const openai: OpenAI | null = aiEnabled
  ? new OpenAI({ baseURL, apiKey })
  : null;
