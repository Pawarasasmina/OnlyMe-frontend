import { newestStoriesFirst } from "./storyOrder.js";

export function storyStartIndex(stories = []) {
  if (!stories.length) return 0;
  return stories.indexOf(newestStoriesFirst(stories)[0]);
}
