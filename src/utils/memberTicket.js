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
  ctx.fillText(__msg("system.OnboardingTicket.e6c167fd27"), 84, 710);
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

// The prototype's ticketCardPNG: transparent margins and punched ticket edges.
export function ticketStoryImage(ticket) {
  const canvas = document.createElement("canvas");
  canvas.width = 860; canvas.height = 1260;
  const ctx = canvas.getContext("2d");
  const x = 40, y = 40, width = 780, height = 1180;
  const shape = () => { ctx.beginPath(); ctx.roundRect(x, y, width, height, 64); };
  shape();
  const fill = ctx.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, "#2A3A55"); fill.addColorStop(.5, "#141C2B"); fill.addColorStop(1, "#1B2A40");
  ctx.fillStyle = fill; ctx.fill();
  ctx.save(); shape(); ctx.clip();
  const glow = ctx.createRadialGradient(x + width / 2, y + 420, 10, x + width / 2, y + 420, 520);
  glow.addColorStop(0, "rgba(156,203,255,.30)"); glow.addColorStop(1, "rgba(156,203,255,0)");
  ctx.fillStyle = glow; ctx.fillRect(x, y, width, height); ctx.restore();
  shape(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.stroke();
  const font = 'system-ui, sans-serif';
  ctx.font = `800 64px ${font}`; ctx.fillStyle = "#9CCBFF"; ctx.fillText("@", x + 64, y + 128);
  const atWidth = ctx.measureText("@").width;
  ctx.fillStyle = "#FFFFFF"; ctx.fillText("seen", x + 64 + atWidth, y + 128);
  ctx.font = `700 34px ${font}`; ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.textAlign = "right"; ctx.fillText(ticket.city.toUpperCase(), x + width - 64, y + 124, 430); ctx.textAlign = "left";
  ctx.font = `700 36px ${font}`; ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.fillText(__msg("fanWeb.member").toUpperCase(), x + 64, y + 470);
  let size = 200;
  do { ctx.font = `800 ${size}px ${font}`; size -= 6; } while (ctx.measureText(ticket.label).width > width - 128 && size > 90);
  const ink = ctx.createLinearGradient(0, y + 500, 0, y + 690);
  ink.addColorStop(0, "#FFFFFF"); ink.addColorStop(.55, "#BFD9F2"); ink.addColorStop(1, "#7FA3C6");
  ctx.fillStyle = ink; ctx.fillText(ticket.label, x + 60, y + 680);
  ctx.font = `500 40px ${font}`; ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fillText(ticket.date, x + 64, y + 790, width - 128);
  ctx.setLineDash([18, 14]); ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 40, y + height - 220); ctx.lineTo(x + width - 40, y + height - 220); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000";
  for (const edge of [x, x + width]) { ctx.beginPath(); ctx.arc(edge, y + height - 220, 28, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.font = `500 44px ${font}`; ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.fillText(ticket.city ? __msg("profile.oneOfTheFirstIn", { value0: ticket.city }) : __msg("profile.oneOfTheFirstOnSeen"), x + 64, y + height - 110, width - 128);
  return canvas.toDataURL("image/png");
}

export function ticketStoryDraft(ticket, author = {}) {
  return { sharedCard: { kind: "ticket", imageUrl: ticketStoryImage(ticket), title: ticket.label, destinationRoute: `/profile/${encodeURIComponent(author.username || "")}`, x: 50, y: 46, scale: 1, rotation: -4 } };
}
