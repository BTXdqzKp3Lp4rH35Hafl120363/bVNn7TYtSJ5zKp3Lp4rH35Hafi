// plugins/calc.js - ESM Version
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';

const __filename = fileURLToPath(import.meta.url);

// Safe Context Info (With Channel Forward Info)
const commonContextInfo = (senderJid) => ({
    mentionedJid: [senderJid],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363408401969787@newsletter',
        newsletterName: "ICONIC-MD",
        serverMessageId: 143
    }
});

// ---------- BASIC SAFE CALC ----------
function calcBasic(expr) {
    try {
        // Replace symbols with Math properties
        let safeExpr = expr
            .replace(/π/g, 'Math.PI')
            .replace(/e/g, 'Math.E')
            .replace(/\^/g, '**')
            .replace(/√/g, 'Math.sqrt');

        // Allow only math-related characters to prevent code injection
        if (/[^0-9+\-*/(). Matha-zA-Z]/.test(safeExpr)) {
            return null;
        }

        return Function(`"use strict"; return (${safeExpr})`)();
    } catch {
        return null;
    }
}

// ---------- ADVANCED FUNCTIONS ----------
function calcAdvanced(input) {
    let args = input.toLowerCase().trim().split(/\s+/);
    let cmdType = args[0];
    let num1 = Number(args[1]);
    let num2 = Number(args[2]);

    // PERCENTAGE (e.g., 20%500)
    if (input.includes("%")) {
        let parts = input.split("%");
        let a = Number(parts[0].trim());
        let b = Number(parts[1].trim());
        if (!isNaN(a) && !isNaN(b)) return `📊 ${a}% of ${b} = ${(a / 100) * b}`;
    }

    if (isNaN(num1) && args.length > 1) return null;

    // LOG & ANTILOG
    if (cmdType === "log") return `📊 log(${num1}) = ${Math.log10(num1)}`;
    if (cmdType === "ln") return `📊 ln(${num1}) = ${Math.log(num1)}`;
    if (cmdType === "antilog") return `📊 antilog(${num1}) = ${Math.pow(10, num1)}`;

    // POWER
    if (cmdType === "pow") return `⚡ ${num1}^${num2} = ${Math.pow(num1, num2)}`;

    // ROOTS
    if (cmdType === "sqrt") return `√${num1} = ${Math.sqrt(num1)}`;
    if (cmdType === "cbrt") return `∛${num1} = ${Math.cbrt(num1)}`;

    // TRIGONOMETRY (DEGREES)
    const toRad = (deg) => deg * (Math.PI / 180);
    const toDeg = (rad) => rad * (180 / Math.PI);

    if (cmdType === "sin") return `sin(${num1}°) = ${Math.sin(toRad(num1)).toFixed(4)}`;
    if (cmdType === "cos") return `cos(${num1}°) = ${Math.cos(toRad(num1)).toFixed(4)}`;
    if (cmdType === "tan") return `tan(${num1}°) = ${Math.tan(toRad(num1)).toFixed(4)}`;

    // INVERSE TRIGONOMETRY
    if (cmdType === "asin") return `sin⁻¹(${num1}) = ${toDeg(Math.asin(num1)).toFixed(4)}°`;
    if (cmdType === "acos") return `cos⁻¹(${num1}) = ${toDeg(Math.acos(num1)).toFixed(4)}°`;
    if (cmdType === "atan") return `tan⁻¹(${num1}) = ${toDeg(Math.atan(num1)).toFixed(4)}°`;

    // FACTORIAL
    if (cmdType === "fact") {
        if (num1 < 0) return "❌ Factorial is not defined for negative numbers.";
        let res = 1;
        for (let i = 1; i <= num1; i++) res *= i;
        return `📊 ${num1}! = ${res}`;
    }

    // RANDOM
    if (cmdType === "rand") {
        let min = num1 || 0;
        let max = num2 || 100;
        let randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        return `🎲 Random Number (${min} - ${max}): ${randomNum}`;
    }

    return null;
}

// ---------- HELP MENU ----------
function helpMenu(prefix) {
    return `╭━━〔 🔢 *ULTRA CALCULATOR* 〕━━┈
┃ ⚡ *Basic Math:*
┃ ${prefix}calc 2+2
┃ ${prefix}calc 5*10
┃
┃ ⚡ *Roots & Powers:*
┃ ${prefix}calc sqrt 25
┃ ${prefix}calc cbrt 27
┃ ${prefix}calc pow 2 8
┃
┃ ⚡ *Logarithms:*
┃ ${prefix}calc log 100
┃ ${prefix}calc ln 10
┃ ${prefix}calc antilog 2
┃
┃ ⚡ *Trigonometry:*
┃ ${prefix}calc sin 90
┃ ${prefix}calc cos 0
┃ ${prefix}calc tan 45
┃
┃ ⚡ *Other Functions:*
┃ ${prefix}calc 20%500 (Percentage)
┃ ${prefix}calc fact 5 (Factorial)
┃ ${prefix}calc rand 1 100 (Random)
┃
┃ 📌 *Constants Supported:* π, e
╰━━━━━━━━━━━━━━━┈`;
}

// ---------- COMMAND ----------
cmd({
    pattern: "calc",
    alias: ["calculate", "math"],
    desc: "Advanced Mathematical Calculator",
    category: "tools",
    react: "🔢",
    filename: __filename
}, async (conn, mek, m, { from, q, prefix, sender, reply }) => {

    try {
        // SHOW HELP MENU IF NO INPUT
        if (!q) {
            return await conn.sendMessage(from, {
                text: helpMenu(prefix),
                contextInfo: commonContextInfo(sender)
            }, { quoted: mek });
        }

        // CHECK ADVANCED FUNCTIONS
        let advResult = calcAdvanced(q);
        if (advResult) {
            return await conn.sendMessage(from, {
                text: `> ${advResult}`,
                contextInfo: commonContextInfo(sender)
            }, { quoted: mek });
        }

        // CHECK BASIC MATH EXPRESSIONS
        let basicResult = calcBasic(q);

        if (basicResult === null || basicResult === undefined || isNaN(basicResult)) {
            return await conn.sendMessage(from, {
                text: `❌ *Invalid input!* Please check your mathematical expression.\n\nType *${prefix}calc* for the help menu.`,
                contextInfo: commonContextInfo(sender)
            }, { quoted: mek });
        }

        // SEND FINAL BASIC RESULT
        return await conn.sendMessage(from, {
            text: `🧮 *Result:* ${basicResult}`,
            contextInfo: commonContextInfo(sender)
        }, { quoted: mek });

    } catch (e) {
        console.error("Calculator Error:", e);
        reply(`❌ Error processing calculation:\n${e.message}`);
    }
});
