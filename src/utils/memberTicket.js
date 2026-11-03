import { getLocale as __uiLocale } from "../i18n/runtime.js";
import { msg as __msg } from "../i18n/runtime.js";
export function memberTicketData(profile = {}, user = {}) {
  const raw = profile.memberNumber ?? profile.joinNumber ?? profile.ticket?.memberNumber
    ?? user.memberNumber ?? user.joinNumber ?? user.ticket?.memberNumber;
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < 1) return null;
  const joinedAt = profile.joinedAt || user.createdAt;
  const date = joinedAt ? new Date(joinedAt) : null;
  return {
    number,
    label: `№${number.toLocaleString(__uiLocale())}`,
    city: profile.city || user.city || "",
    date: date && Number.isFinite(date.getTime()) ? date.toLocaleDateString(__uiLocale(), { day: "numeric", month: "long", year: "numeric" }) : "",
    badgeEligible: number <= 10000,
  };
}

export function showMemberNumber(user = {}) {
  return user.showMemberNumber !== false;
}

export function ticketImage(ticket) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1728;
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.roundRect(0, 0, 1080, 1728, 90);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1728);
  gradient.addColorStop(0, "#303d52");
  gradient.addColorStop(.55, "#141d2a");
  gradient.addColorStop(1, "#101720");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1728);
  const glow = ctx.createRadialGradient(540, 800, 0, 540, 800, 460);
  glow.addColorStop(0, "rgba(156,203,255,.2)");
  glow.addColorStop(1, "rgba(156,203,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1728);
  const font = 'system-ui, sans-serif';
  ctx.font = `750 64px ${font}`;
  ctx.fillStyle = "#9CCBFF";
  ctx.fillText("@", 84, 150);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("seen", 145, 150);
  ctx.font = `700 30px ${font}`;
  ctx.fillStyle = "#a8afba";
  ctx.textAlign = "right";
  ctx.fillText(ticket.city.toUpperCase(), 996, 140, 620);
  ctx.textAlign = "left";
  ctx.font = `700 34px ${font}`;
  ctx.fillText("MEMBER", 84, 710);
  ctx.font = `800 190px ${font}`;
  ctx.fillStyle = "#cce4fa";
  ctx.fillText(ticket.label, 76, 930, 920);
  ctx.font = `400 38px ${font}`;
  ctx.fillStyle = "#a8afba";
  ctx.fillText(ticket.date, 84, 1010, 910);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.setLineDash([7, 7]);
  ctx.beginPath(); ctx.moveTo(0, 1500); ctx.lineTo(1080, 1500); ctx.stroke();
  ctx.fillStyle = "#c9cdd3";
  ctx.fillText(ticket.city ? __msg("profile.oneOfTheFirstIn", { value0: ticket.city }) : __msg("profile.oneOfTheFirstOnSeen"), 84, 1610, 910);
  ctx.globalCompositeOperation = "destination-out";
  for (const x of [0, 1080]) {
    ctx.beginPath(); ctx.arc(x, 1500, 32, 0, Math.PI * 2); ctx.fill();
  }
  return canvas.toDataURL("image/png");
}
