export function inferWallTopic(t){t=(t||'').toLowerCase();if(!t.trim())return '';
  if(/\b(partner|buddy|buddies|company|join me|anyone up|who'?s in|who is in|spare ticket|extra ticket|new in (dubai|town|the city)|make friends|meet (people|new))\b|компани|кто со мной|партн[её]р|напарни|лишний билет|новенька|новенький|ищу друзей|познаком/.test(t))return 'Meet people';
  if(/\b(room|flat|apartment|studio|rent|roommate|lease|villa)\b|квартир|аренд|комнат|жиль/.test(t))return 'Housing';
  if(/\b(plumber|electrician|cleaner|cleaning|repair|accountant|lawyer|mechanic|babysitter|nanny|tutor|detail|detailed|movers?)\b|сантехник|мастер|ремонт|уборк|няня|бухгалтер/.test(t))return 'Services';
  if(/\b(job|jobs|hire|hiring|freelance|cv|portfolio|intern|work)\b|работ|ваканси/.test(t))return 'Work';
  if(/\b(kid|kids|child|children|baby|school|playground|family)\b|дет|ребён|школ/.test(t))return 'Kids & Family';
  if(/\b(restaurant|caf[eé]|coffee|food|eat|dinner|lunch|breakfast|brunch)\b|еда|ресторан|кафе|кофе/.test(t))return 'Food';
  if(/\b(flight|trip|travel|visa|hotel|airport)\b|поездк|виза|отел|аэропорт/.test(t))return 'Travel';
  if(/\b(where|place|beach|park|gym|spot|shop|salon)\b|где |пляж|парк|место/.test(t))return 'Places';
  return 'Community'}
