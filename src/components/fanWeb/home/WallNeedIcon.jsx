const shapes = {
  need_help: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6"/><path d="M6 6l3.4 3.4M14.6 14.6 18 18M18 6l-3.4 3.4M9.4 14.6 6 18"/></>,
  looking_for: <><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></>,
  offering: <><path d="M20 12v8.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5V12"/><path d="M2.5 7.5h19V12h-19z"/><path d="M12 21V7.5"/><path d="M12 7.5H8a2.5 2.5 0 1 1 0-5c2.6 0 4 5 4 5zM12 7.5h4a2.5 2.5 0 1 0 0-5c-2.6 0-4 5-4 5z"/></>,
  buy_sell: <><path d="M20.6 13.4 12 22 2 12V4a2 2 0 0 1 2-2h8l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/></>,
  question: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.2a8.4 8.4 0 1 1 16.1-4.3z"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.8c0 1.6-2.4 2.1-2.4 3.6"/><path d="M12 16.4h.01"/></>,
  recommendation: <><path d="M12 3.2l2.6 5.4 5.9.9-4.3 4.1 1 5.9L12 16.7l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z"/></>,
  event: <><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>,
};
export default function WallNeedIcon({ kind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg>;
}
