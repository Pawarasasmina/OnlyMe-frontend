const TOONC = {};
export function officialPortrait(k){if(TOONC[k])return TOONC[k];let h=0;for(const c of String(k))h=(h*31+c.charCodeAt(0))>>>0;
  const pick=(a,n)=>a[(h>>>n)%a.length];
  const bg=pick(['#9CCBFF','#B8A7FF','#F58FB8','#6ECF97','#F2C94C','#FF9F8A','#7FD3E6'],0);
  const skin=pick([['#F6D3B8','#E9BC9C'],['#E8B48F','#D69B74'],['#C98E66','#B57A53'],['#9C6644','#865537'],['#6E4630','#5C3A27']],3);
  const hair=pick(['#2B1E1A','#4A2F22','#1B1B22','#8A5A3B','#D9A45B','#C2453B'],6);
  const shirt=pick(['#1E2A44','#2F4A7A','#F4F1EA','#3E2C5A','#22413A','#5B2A3A'],9);
  const style=(h>>>12)%5;
  const H=[`<path d="M19.5 29c-1.2-10.5 5-18 12.5-18s13.7 7.5 12.5 18c-2.2-6.5-6.4-9.6-12.5-9.6S21.7 22.5 19.5 29z" fill="${hair}"/>`,
    `<path d="M17.5 31c-1.2-12.5 6.2-20 14.5-20s15.7 7.5 14.5 20v15c-3.2 0-4.2-2.2-4.2-6.2V27.5c-3-3.3-6.3-5-10.3-5s-7.3 1.7-10.3 5v12.3c0 4-1 6.2-4.2 6.2z" fill="${hair}"/>`,
    `<circle cx="32" cy="9.5" r="6.2" fill="${hair}"/><path d="M19.5 29c-1.2-10.5 5-18 12.5-18s13.7 7.5 12.5 18c-2.2-6.5-6.4-9.6-12.5-9.6S21.7 22.5 19.5 29z" fill="${hair}"/>`,
    `${[[22,18],[27,13.5],[33,12],[39,14],[43,19],[20,24],[44,25]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5.4" fill="${hair}"/>`).join('')}`,
    `<path d="M19.5 26.5c0-9 5.5-15 12.5-15s12.5 6 12.5 15z" fill="${shirt==='#F4F1EA'?'#2F4A7A':shirt}"/><path d="M42 25.5h8.5c.8 0 1 1.2.3 1.6L44 27.8z" fill="${shirt==='#F4F1EA'?'#2F4A7A':shirt}"/>`][style];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><circle cx="50" cy="12" r="16" fill="#fff" opacity=".14"/>
    <path d="M9 64c2.3-12.5 11.5-18.5 23-18.5S52.7 51.5 55 64z" fill="${shirt}"/>
    <rect x="27" y="37.5" width="10" height="10" rx="4.5" fill="${skin[1]}"/>
    <ellipse cx="32" cy="29.5" rx="12.2" ry="13.6" fill="${skin[0]}"/>
    ${H}
    <circle cx="27.3" cy="30.5" r="1.7" fill="#1B1F2A"/><circle cx="36.7" cy="30.5" r="1.7" fill="#1B1F2A"/>
    <circle cx="24.6" cy="34.6" r="2.2" fill="#F58FB8" opacity=".28"/><circle cx="39.4" cy="34.6" r="2.2" fill="#F58FB8" opacity=".28"/>
    <path d="M28.4 36.2q3.6 3 7.2 0" stroke="#1B1F2A" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`;
  return TOONC[k]='data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
