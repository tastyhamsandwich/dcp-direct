import { redirect } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

type RankValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 100;

const one_day = 60 * 60 * 24;


export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const EMAIL_PROVIDERS = {
  // Google
  "gmail.com": "https://gmail.com",
  "googlemail.com": "https://gmail.com",

  // Microsoft
  "outlook.com": "https://outlook.live.com",
  "hotmail.com": "https://outlook.live.com",
  "live.com": "https://outlook.live.com",
  "msn.com": "https://outlook.live.com",

  // Yahoo
  "yahoo.com": "https://mail.yahoo.com",
  "yahoo.co.uk": "https://mail.yahoo.com",
  "yahoo.co.jp": "https://mail.yahoo.co.jp",
  "ymail.com": "https://mail.yahoo.com",

  // Apple
  "icloud.com": "https://www.icloud.com/mail",
  "me.com": "https://www.icloud.com/mail",
  "mac.com": "https://www.icloud.com/mail",

  // AOL
  "aol.com": "https://mail.aol.com",

  // Proton
  "proton.me": "https://mail.proton.me",
  "protonmail.com": "https://mail.proton.me",

  // Other popular providers
  "zoho.com": "https://mail.zoho.com",
  "mail.com": "https://www.mail.com",
  "gmx.com": "https://www.gmx.com",
  "tutanota.com": "https://mail.tutanota.com",
  "fastmail.com": "https://www.fastmail.com",

  // Popular international providers
  "yandex.ru": "https://mail.yandex.ru",
  "mail.ru": "https://mail.ru",
  "web.de": "https://web.de/email/",
  "t-online.de": "https://email.t-online.de",
  "qq.com": "https://mail.qq.com",
} as const;

export type EmailProviderDomains = keyof typeof EMAIL_PROVIDERS;

export const USER_COLORS = [
  "text-red-400",
  "text-green-400",
  "text-purple-400",
  "text-yellow-400",
  "text-pink-400",
  "text-purple-400",
  "text-indigo-400",
  "text-teal-400",
  "text-orange-400",
  "text-cyan-400",
];

export const usernameColorMap: { [username: string]: string } = {};
let colorIndex = 0;

export const EmailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	path: '/',
	maxAge: one_day
} as const;

export const testIsEmail = (email: string) => {
  return EmailRegExp.test(email);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export function valueToRank(value: RankValue, capitalize = false): string {
	//THIS CAN BE WRITTEN BETTER...
	//str.charAt(0).toUpperCase() + str.slice(1)
	switch (value) {
		case 2:
			return capitalize ? "Two" : "two";
		case 3:
			return capitalize ? "Three" : "three";
		case 4:
			return capitalize ? "Four" : "four";
		case 5:
			return capitalize ? "Five" : "five";
		case 6:
			return capitalize ? "Six" : "six";
		case 7:
			return capitalize ? "Seven" : "seven";
		case 8:
			return capitalize ? "Eight" : "eight";
		case 9:
			return capitalize ? "Nine" : "nine";
		case 10:
			return capitalize ? "Ten" : "ten";
		case 11:
			return capitalize ? "Jack" : "jack";
		case 12:
			return capitalize ? "Queen" : "queen";
		case 13:
			return capitalize ? "King" : "king";
		case 14:
			return capitalize ? "Ace" : "ace";
		case 100:
			return capitalize ? "Wild" : "wild";
		default:
			throw new Error(`Invalid rank value: ${value}`);
	}
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function valueTruthy(value: any): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function getUsernameColor(username: string, localUsername?: string) {
  if (localUsername && username === localUsername) {
    return "text-blue-400";
  }
  if (!usernameColorMap[username]) {
    // Assign next color in the palette
    usernameColorMap[username] = USER_COLORS[colorIndex];
    colorIndex = (colorIndex + 1) % USER_COLORS.length;
  }
  return usernameColorMap[username];
}