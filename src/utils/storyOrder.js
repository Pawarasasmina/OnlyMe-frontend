export function newestStoriesFirst(stories = []) {
  return stories.map((story, index) => ({ story, index, time: new Date(story.createdAt).getTime() }))
    .sort((a, b) => {
      const left = Number.isFinite(a.time) ? a.time : -Infinity;
      const right = Number.isFinite(b.time) ? b.time : -Infinity;
      return (right - left || b.index - a.index);
    }).map(item => item.story);
}
